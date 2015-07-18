editAreaLoader.window_loaded();

var sId = "";
if (document.getElementById("CalculatedFormula") != null)
{
	sId = "CalculatedFormula";
}
else if (document.getElementById("formulaTextArea") != null)
{
	sId = "formulaTextArea";
}
else if (document.getElementById("ValidationFormula") != null)
{
	sId = "ValidationFormula";
}

var textarea = document.getElementById(sId);
//textarea.style.wordWrap = "normal !important";
//textarea.style.whiteSpace = "nowrap !important"

editAreaLoader.init({
	id: sId	// id of the textarea to transform		
	,start_highlight: true	// if start with highlight
	,allow_resize: "both"
	,allow_toggle: true
	,word_wrap: false
	,language: "en"
	,syntax: "forceformula"
	,replace_tab_by_spaces: 2
	,font_size: "8"
	,font_family: "verdana, monospace"
	,min_height: 400
	,min_width: 600
	,show_line_colors: true
	,EA_load_callback: "EALoaded"
});

//execute this manually because chrome doesn't recognize off on intial load?
//the textarea[wrap=off] useragent styles don't apply initially for some reason
function EALoaded()
{
	editAreaLoader.execCommand(sId, 'set_word_wrap', true);
	editAreaLoader.execCommand(sId, 'set_word_wrap', false);
	
	//backup the standard salesforce insert function
	var insertTextAtSelectionInEditor_backup = insertTextAtSelectionInEditor;
	
	//override standard insert function
	insertTextAtSelectionInEditor = function(textAreaName, value)
	{
		//remove leading and trailing space around value to insert
		value = value.trim();
		
		//if the enhanced editor is loaded then insert using its functions
		if (document.getElementById("edit_area_toggle_checkbox_" + sId).checked == true)
		{
			editAreaLoader.insertTags(sId, value, "");
		}
		else
		{
			//if the enhanced editor is not loaded then insert using salesforce's normal function
			insertTextAtSelectionInEditor_backup(textAreaName, value);
		}
	}
	
	//SETUP FIELD DETAILS
	editorJQuery(".formulaFooter").after("<input id='formulaEditorFieldsLoad' type='submit' class='btn' value='Load Field Details' /><div id='formulaEditorFields' style='display: none;'><div id='fieldValuesPreviewShell' style='display: inline; text-align: right; float: right;'><input type='text' id='fieldValuesPreviewId' placeholder='Enter Record Id' /> <input id='fieldValuesPreviewButton' type='button' class='btn' value='Preview Values' /></div><table id='formulaEditorFieldsTable' class='list'></table></div>");
	
	editorJQuery("#formulaEditorFieldsLoad").click(LoadFormulaFieldDetails);
	
	editorJQuery("#fieldValuesPreviewButton").click(LoadFieldValuesPreview);
	
	editorJQuery.get("/" + editorJQuery("#entity").val(), function( data ) {
		window.sCurrentObjectAPIName = editorJQuery(data).find("table.detailList td:contains('API Name')").next().text();
		//LOAD CURRENT OBJECT FIELDS
		window.oCurrentObjectFields = null;
		jsforceConnection.sobject(window.sCurrentObjectAPIName).describe$(function(err, meta) {
			if (err) { return console.error(err); }
			window.oCurrentObjectFields = meta.fields;
		});
	});
	
	//CONNECT TO SALESFORCE
	window.jsforceConnection = new jsforce.Connection({
		serverUrl : "https://" + document.location.host,
		sessionId : readCookie("sid")
	});	
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function LoadFormulaFieldDetails(e)
{
	e.preventDefault();
	
	var sFormula = editorJQuery("#" + sId).val();
	var oFields = GetFieldsFromFormula(sFormula);
	
	//LOAD THE TABLE	
	var $table = editorJQuery("#formulaEditorFieldsTable");
	
	$table.empty();
	
	$table.append("<tr class='headerRow'><th>Field</th><th>Label</th><th>Type</th><th>Formula</th><th>Value</th></tr>");

	//LOOP OVER EACH FIELD PATH AND IDENTIFY WHAT FINAL FIELD IT REPRESENTS
	for (var i = 0; i < oFields.length; i++)
	{
		var oFieldParts = oFields[i].split(".");
				
		$table.append("<tr id='field" + i + "' data-fieldIndex='" + i + "' class='fieldRow'><td class='fieldPath'>" + oFields[i] + "</td><td class='fieldLabel'></td><td class='fieldType'></td><td class='fieldFormula'></td><td class='fieldValue'></td></tr>");
		
		FindFieldDescribeRecursive(i, oFieldParts, 0, oCurrentObjectFields);
	}	
	
	editorJQuery("#formulaEditorFields").show();

}

//LOOP OVER EACH FIELD PART AND WORK OUR WAY UP THE RELATIONSHIP CHAIN
function FindFieldDescribeRecursive(iFieldIndex, oFieldParts, iFieldPartIndex, oCurrentFieldPartFields)
{
	var oFieldDescribe = null;
	//FIND THE FIELD UNDER THE OBJECT
	for (var f = 0; f < oCurrentFieldPartFields.length; f++)
	{
		if (oFieldParts[iFieldPartIndex].replace("__r", "__c") == oCurrentFieldPartFields[f].name)
		{
			oFieldDescribe = oCurrentFieldPartFields[f];
			
			//IF WE HAVE MORE RELATIONSHIPS TO WORK THOUGH
			if (iFieldPartIndex != oFieldParts.length - 1)
			{
				console.log("requesting relationship fields: " + oFieldDescribe.referenceTo[0]);
				jsforceConnection.sobject(oFieldDescribe.referenceTo[0]).describe$(function(err, meta) {
					if (err) { return console.error(err); }
					iFieldPartIndex += 1;
					return FindFieldDescribeRecursive(iFieldIndex, oFieldParts, iFieldPartIndex, meta.fields);
				});
			}
			else
			{
				UpdateFieldDetails(iFieldIndex, oFieldParts, oFieldDescribe);
			}
		}
	}
}

function UpdateFieldDetails(iFieldIndex, oFieldParts, oFieldDescribe)
{
	console.log(oFieldDescribe);
	$fieldTR = editorJQuery("#formulaEditorFieldsTable tr#field" + iFieldIndex);
	$fieldTR.data("describe", oFieldDescribe);
	$fieldTR.find("td.fieldLabel").text(oFieldDescribe.label);
	$fieldTR.find("td.fieldType").text(oFieldDescribe.type);
	if (oFieldDescribe.calculatedFormula != null)
	{
		var $formulaViewLink = editorJQuery("<a href='#'>View</a>");
		$fieldTR.find("td.fieldFormula").append($formulaViewLink);
	}
	
}

function LoadFieldValuesPreview(e)
{
	e.preventDefault();
	
	var sRecordId = editorJQuery("#fieldValuesPreviewId").val();
	
	if (sRecordId.trim() == "")
	{
		alert("Please enter a 15 character or 18 character record id.");
		return false;
	}
	
	//LOOP OVER FIELD DETAIL TABLE ROWS AND BUILD SOQL QUERY
	var oFields = [];
	editorJQuery("#formulaEditorFieldsTable").find("tr.fieldRow td.fieldPath").each(function()
	{
		oFields.push(editorJQuery(this).text());
	});	
	
	jsforceConnection.query("SELECT Id, Name, " + oFields.join(",") + " FROM " + window.sCurrentObjectAPIName + " WHERE Id = '" + sRecordId + "'", function(err, result) {
		if (err) { return console.error(err); }
		var oRecord = result.records[0];
		console.log(oRecord);
		for (var f = 0; f < oFields.length; f++)
		{
			var sValue = "";
			var oFieldParts = oFields[f].split(".");
			//WORK OUR WAY THROUGH THE FIELD RELATIONSHIPS ON THE RESULT RECORD
			var oCurrentRecordPart = oRecord;
			for (var p = 0; p < oFieldParts.length; p++)
			{
				oCurrentRecordPart = oCurrentRecordPart[oFieldParts[p]];
			}
			editorJQuery("tr#field" + f).find("td.fieldValue").text(oCurrentRecordPart);
		}
	});

}

function GetFieldsFromFormula(sFormula)
{
	//COMMENTS
	sFormula = sFormula.replace(/\/\*[\s\S]*?\*\//igm, " ");
	
	//STRINGS
	sFormula = sFormula.replace(/\"[\s\S]*?\"/igm, " ");
	sFormula = sFormula.replace(/\'[\s\S]*?\'/igm, " ");
	
	//PARENS
	sFormula = sFormula.replace(/\(/ig, " ");
	sFormula = sFormula.replace(/\)/ig, " ");
	
	//COMMAS
	sFormula = sFormula.replace(/\,/ig, " ");
	
	//OPERATORS
	sFormula = sFormula.replace(/[\+\-\/\*\=\<\>]/ig, " ");
	
	//VALUES
	sFormula = sFormula.replace(/(\btrue\b|\bfalse\b|\bnull\b|\b[0-9]+\b)/ig, " ");
	
	//FUNCTIONS
	sFormula = sFormula.replace(/(\bBEGINS\b|\bBLANKVALUE\b|\bBR\b|\bCEILING\b|\bCONTAINS\b|\bDATE\b|\bDATEVALUE\b|\bDAY\b|\bEXP\b|\bFIND\b|\bFLOOR\b|\bGETSESSIONID\b|\bHYPERLINK\b|\bIMAGE\b|\bINCLUDES\b|\bISBLANK\b|\bISCHANGED\b|\bISNEW\b|\bISNULL\b|\bISNUMBER\b|\bISPICKVAL\b|\bLEFT\b|\bLEN\b|\bLN\b|\bLOG\b|\bLOWER\b|\bLPAD\b|\bMAX\b|\bMID\b|\bMIN\b|\bMOD\b|\bMONTH\b|\bNOT\b|\bNOW\b|\bNULLVALUE\b|\bPRIORVALUE\b|\bREGEX\b|\bRIGHT\b|\bROUND\b|\bRPAD\b|\bSQRT\b|\bSUBSTITUTE\b|\bTEXT\b|\bTODAY\b|\bTRIM\b|\bUPPER\b|\bVALUE\b|\bYEAR\b)/ig, " ");
	
	//BOOLEAN
	sFormula = sFormula.replace(/(\bAND\b|\bCASE\b|\bIF\b|\bOR\b)/ig, " ");
	
	//REMOVE NEWLINES AND MULTIPLE SPACES
	sFormula = sFormula.replace(/\s+/ig, " ");
	
	sFormula = sFormula.trim();
	
	oFields = sFormula.split(" ");
	
	var oUniqueFields = [];
	editorJQuery.each(oFields, function(i, el){
			if(editorJQuery.inArray(el, oUniqueFields) === -1) oUniqueFields.push(el);
	});
	
	return oUniqueFields;
}




