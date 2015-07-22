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

var oFormulaEditorSettings = {
	TextAreaId: sId,
	TextAreaEditorHeight: 400,
	TextAreaEditorDisplay: "onload",	
	OverrideInsertButtons: true,
	LoadFieldDetailsAfterSelector: ".formulaFooter"
}

//custom objects have their object id in the entity field, standard objects have their object name
if (editorJQuery("#entity").val().charAt(0) == "0")
{
	oFormulaEditorSettings.ObjectId = editorJQuery("#entity").val();
}
else
{
	oFormulaEditorSettings.ObjectAPIName = editorJQuery("#entity").val();
}
	
//CONNECT TO SALESFORCE
window.jsforceConnection = new jsforce.Connection({
	serverUrl : "https://" + document.location.host,
	sessionId : readCookie("sid")
});	

ActivateEditor(oFormulaEditorSettings);

function ActivateEditor(oFormulaEditorSettings)
{
	var oDefaultSettings = {
		TextAreaId: "",
		TextAreaEditorHeight: 400,
		TextAreaEditorDisplay: "onload",
		ObjectId: "",
		ObjectAPIName: "",
		ObjectFields: null,
		FieldDetailsShellId: "",
		OverrideInsertButtons: false,
		LoadFieldDetailsAfterSelector: "",
		FieldsShell: null,
		FieldsTable: null,
		FieldValuesPreviewInput: null
	}
	
	oFormulaEditorSettings = editorJQuery.extend(oDefaultSettings, oFormulaEditorSettings);
	
	editorJQuery("#" + oFormulaEditorSettings.TextAreaId).data("formulaEditorSettings", oFormulaEditorSettings);
	
	editAreaLoader.init({
		id: oFormulaEditorSettings.TextAreaId	// id of the textarea to transform		
		,start_highlight: true	// if start with highlight
		,allow_resize: "both"
		,allow_toggle: true
		,word_wrap: false
		,language: "en"
		,syntax: "forceformula"
		,replace_tab_by_spaces: 2
		,font_size: "8"
		,font_family: "verdana, monospace"
		,min_height: oFormulaEditorSettings.TextAreaEditorHeight
		,min_width: 600
		,show_line_colors: true
		,EA_load_callback: "FormulaEditAreaLoaded"
		,display: oFormulaEditorSettings.TextAreaEditorDisplay
	});
}


function FormulaEditAreaLoaded(sTextAreaId)
{
	oFormulaEditorSettings = editorJQuery("#" + sTextAreaId).data("formulaEditorSettings");
	
	//execute this manually because chrome doesn't recognize off on intial load?
	//the textarea[wrap=off] useragent styles don't apply initially for some reason
	editAreaLoader.execCommand(oFormulaEditorSettings.TextAreaId, 'set_word_wrap', true);
	editAreaLoader.execCommand(oFormulaEditorSettings.TextAreaId, 'set_word_wrap', false);
	
	if (oFormulaEditorSettings.OverrideInsertButtons == true)
	{
		//backup the standard salesforce insert function
		var insertTextAtSelectionInEditor_backup = insertTextAtSelectionInEditor;
		
		//override standard insert function
		insertTextAtSelectionInEditor = function(textAreaName, value)
		{
			//remove leading and trailing space around value to insert
			value = value.trim();
			
			//if the enhanced editor is loaded then insert using its functions
			if (document.getElementById("edit_area_toggle_checkbox_" + sTextAreaId).checked == true)
			{
				editAreaLoader.insertTags(sTextAreaId, value, "");
			}
			else
			{
				//if the enhanced editor is not loaded then insert using salesforce's normal function
				insertTextAtSelectionInEditor_backup(textAreaName, value);
			}
		}
	}
	
	//SETUP FIELD DETAILS
	var $fieldDetails = editorJQuery("<input type='submit' class='btn formulaEditorFieldsLoad' style='float: left;' value='Load Field Details' /><div class='formulaEditorFields' style='display: none;'><div class='fieldValuesPreviewShell' style='display: inline; text-align: right; float: right;'><input type='text' class='fieldValuesPreviewId' placeholder='Enter Record Id' /> <input type='button' class='fieldValuesPreviewButton btn' value='Preview Values' /></div><table class='formulaEditorFieldsTable list'></table></div>");
	
	$loadButton = $fieldDetails.filter("input.formulaEditorFieldsLoad");
	$loadButton.data("formulaEditorSettings", oFormulaEditorSettings);
	
	$fieldsShell = $fieldDetails.filter("div.formulaEditorFields");
	oFormulaEditorSettings.FieldsShell = $fieldsShell;
	
	$previewButton = $fieldDetails.find("input.fieldValuesPreviewButton");
	$previewButton.data("formulaEditorSettings", oFormulaEditorSettings);
	
	$previewInput = $fieldDetails.find("input.fieldValuesPreviewId");
	oFormulaEditorSettings.FieldValuesPreviewInput = $previewInput;
	
	$fieldsTable = $fieldDetails.find("table.formulaEditorFieldsTable");
	oFormulaEditorSettings.FieldsTable = $fieldsTable;
	
	editorJQuery(oFormulaEditorSettings.LoadFieldDetailsAfterSelector).after($fieldDetails);
	
	$loadButton.click(LoadFormulaFieldDetails);
	
	$previewButton.click(LoadFieldValuesPreview);
	
	if (oFormulaEditorSettings.ObjectAPIName == "")
	{
		editorJQuery.get("/" + oFormulaEditorSettings.ObjectId, function( data ) {
			oFormulaEditorSettings.ObjectAPIName = editorJQuery(data).find("table.detailList td:contains('API Name')").next().text();
			//LOAD CURRENT OBJECT FIELDS
			jsforceConnection.sobject(oFormulaEditorSettings.ObjectAPIName).describe$(function(err, meta) {
				if (err) { return console.error(err); }
				oFormulaEditorSettings.ObjectFields = meta.fields;
			});
		});
	}
	else
	{
		//LOAD CURRENT OBJECT FIELDS
		jsforceConnection.sobject(oFormulaEditorSettings.ObjectAPIName).describe$(function(err, meta) {
			if (err) { return console.error(err); }
			oFormulaEditorSettings.ObjectFields = meta.fields;
		});
	}
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
	var oFormulaEditorSettings = editorJQuery(this).data("formulaEditorSettings");
	
	var sFormula = editorJQuery("#"+oFormulaEditorSettings.TextAreaId).val();
	var oFields = GetFieldsFromFormula(sFormula);
	
	//LOAD THE TABLE	
	var $table = oFormulaEditorSettings.FieldsTable;
	
	$table.empty();
	
	$table.append("<tr class='headerRow'><th>Field</th><th>Type</th><th>Details</th><th><a class='formulaFieldCompile' href='#' style='text-decoration: underline;'>(F) Compile</a></th><th>Edit</th><th>Value</th></tr>");

	//LOOP OVER EACH FIELD PATH AND IDENTIFY WHAT FINAL FIELD IT REPRESENTS
	for (var i = 0; i < oFields.length; i++)
	{
		var oFieldParts = oFields[i].split(".");
				
		var $fieldTR = editorJQuery("<tr id='field" + i + "' data-fieldIndex='" + i + "' class='fieldRow'><td class='fieldPath'>" + oFields[i] + "</td><td class='fieldType'></td><td class='fieldDetails'></td><td class='fieldCompile'></td><td class='fieldEdit'></td><td class='fieldValue'></td></tr>");
		$table.append($fieldTR);
		
		FindFieldDescribeRecursive($fieldTR, oFormulaEditorSettings.ObjectAPIName, i, oFieldParts, 0, oFormulaEditorSettings.ObjectFields);
	}
	
	$table.find("tr.headerRow a.formulaFieldCompile").click(function()
	{
		$table.find("> tbody > tr.fieldRow > td.fieldEdit").each(function()
		{
			var $trField = editorJQuery(this).parent();
			var oFieldDescribe = $trField.data("fieldDescribe");
			if (oFieldDescribe.calculatedFormula != null)
			{
				var $tdCompileField = editorJQuery(this).parent().find("> td.fieldCompile");
				$tdCompileField.text("Loading");
				var sEditURL = editorJQuery(this).find("a").attr("href");
				editorJQuery.get(sEditURL, function(data)
				{
					var $form = editorJQuery(data).find("#editPage");
					$form.find("input[type='submit'][name!='validateDefaultFormula']").remove();
					editorJQuery.post(sEditURL, $form.serialize(), function(data)
					{
						var sCompileSize = editorJQuery(data).find("#validationStatus").text();
						sCompileSize = sCompileSize.replace("No syntax errors in merge fields or functions. (Compiled size: ", "");
						sCompileSize = sCompileSize.replace(" characters)", "");
						$tdCompileField.text(sCompileSize.trim());
					});
				});
			}
		});
		
		return false;
	});
	
	oFormulaEditorSettings.FieldsShell.show();
	
	e.preventDefault();
	e.stopImmediatePropagation();

}

//LOOP OVER EACH FIELD PART AND WORK OUR WAY UP THE RELATIONSHIP CHAIN
function FindFieldDescribeRecursive($fieldTR, sObjectName, iFieldIndex, oFieldParts, iFieldPartIndex, oCurrentFieldPartFields)
{
	var oFieldDescribe = null;
	//FIND THE FIELD UNDER THE OBJECT
	for (var f = 0; f < oCurrentFieldPartFields.length; f++)
	{
		if (
			oFieldParts[iFieldPartIndex] == oCurrentFieldPartFields[f].name ||
			oFieldParts[iFieldPartIndex] == oCurrentFieldPartFields[f].relationshipName
		)
		{
			oFieldDescribe = oCurrentFieldPartFields[f];
			
			//IF WE HAVE MORE RELATIONSHIPS TO WORK THOUGH
			if (iFieldPartIndex != oFieldParts.length - 1)
			{
				console.log("requesting relationship fields: " + oFieldDescribe.referenceTo[0]);
				jsforceConnection.sobject(oFieldDescribe.referenceTo[0]).describe$(function(err, meta) {
					if (err) { return console.error(err); }
					iFieldPartIndex += 1;
					console.log(meta);
					return FindFieldDescribeRecursive($fieldTR, oFieldDescribe.referenceTo[0], iFieldIndex, oFieldParts, iFieldPartIndex, meta.fields);
				});
			}
			else
			{
				UpdateFieldDetails($fieldTR, sObjectName, iFieldIndex, oFieldParts, oFieldDescribe);
			}
		}
	}
}

function UpdateFieldDetails($fieldTR, sObjectName, iFieldIndex, oFieldParts, oFieldDescribe)
{
	console.log(oFieldDescribe);
	$fieldTR.data("fieldDescribe", oFieldDescribe);
	$fieldTR.data("objectName", sObjectName);
	$fieldTR.find("td.fieldType").text(oFieldDescribe.type);
	if (oFieldDescribe.calculatedFormula != null)
	{
		$fieldTR.find("td.fieldType").append(" (F)");
	}
	
	var $detailsViewLink = editorJQuery("<a href='#'>View</a>");
	$fieldTR.find("td.fieldDetails").append($detailsViewLink);
	$detailsViewLink.click(function()
	{
		if ($detailsViewLink.text() == "View")
		{
			editorJQuery(this).closest("tr").next().show();
			$detailsViewLink.text("Hide");
			//attempt to turn on a formula editor if it exists
			editorJQuery(this).closest("tr").next().find("label:contains('Toggle editor')").prev().filter(":not(:checked)").click();
		}
		else
		{
			editorJQuery(this).closest("tr").next().hide();
			$detailsViewLink.text("View");
		}
		return false;
	});
	
	var $fieldDetailsTR = editorJQuery("<tr class='fieldDetailsRow' style='display: none;'><td style='padding-left: 30px;' colspan='" + $fieldTR.children().length + "'></td></tr>");
	$fieldTR.after($fieldDetailsTR);
	
	var $fieldDetailsTC = $fieldDetailsTR.children(0);
	var $detailsTable = editorJQuery("<table class='list'><tr class='headerRow'><th>Detail</th><th>Value</th></tr></table>");
	$fieldDetailsTC.append($detailsTable);
	
	$detailsTable.append("<tr><td>Label</td><td>" + oFieldDescribe.label + "</td></tr>");
	
	if (oFieldDescribe.calculatedFormula != null)
	{
		var sTextAreaId = sObjectName+"-"+oFieldDescribe.name;
		$detailsTable.append("<tr><td>Formula</td><td><textarea id='" + sTextAreaId + "' cols='80' rows='10' style='width: 99%; height: 15em;' wrap='soft'></textarea><div id='"+sTextAreaId+"Footer'></div></td></tr>");
		editorJQuery("#" + sTextAreaId).val(oFieldDescribe.calculatedFormula);
		
		var oSubFormulaEditorSettings = {
			TextAreaId: sTextAreaId,
			TextAreaEditorHeight: 200,
			TextAreaEditorDisplay: "later",
			ObjectId: "",
			ObjectAPIName: sObjectName,
			OverrideInsertButtons: false,
			LoadFieldDetailsAfterSelector: "#" + sTextAreaId+"Footer"
		}
		
		ActivateEditor(oSubFormulaEditorSettings);	
	}
	else if (oFieldDescribe.picklistValues.length > 0)
	{
		$detailsTable.append("<tr><td>Picklist Values</td><td><table class='list picklistValues'><tr class='headerRow'><th>Value</th><th>Default</th></tr></table></td></tr>");
		var $picklistTable = $detailsTable.find("table.picklistValues");
		
		for (var v = 0; v < oFieldDescribe.picklistValues.length; v++)
		{
			$picklistTable.append("<tr><td>" + oFieldDescribe.picklistValues[v].label + "</td><td>" + oFieldDescribe.picklistValues[v].defaultValue + "</td></tr>");
		}
	}

	if (sObjectName.indexOf("__c") > -1)
	{
		jsforceConnection.tooling.sobject('CustomObject')
		.find({ DeveloperName: sObjectName.replace("__c", "") })
		.execute(function(err, records) {
			if (err) { return console.error(err); }
			console.log("fetched : " + records);
			jsforceConnection.tooling.sobject('CustomField')
			.find({ TableEnumOrId: records[0].Id, DeveloperName: oFieldDescribe.name.replace("__c", "") })
			.execute(function(err, records) {
				if (err) { return console.error(err); }
				console.log("fetched : " + records[0]);
				$fieldTR.find("td.fieldEdit").append("<a href='/" + records[0].Id + "/e' target='_blank'>Edit</a>");
			});
		});
	}
	else
	{
		jsforceConnection.tooling.sobject('CustomField')
		.find({ TableEnumOrId: sObjectName, DeveloperName: oFieldDescribe.name.replace("__c", "") })
		.execute(function(err, records) {
			if (err) { return console.error(err); }
			console.log("fetched : " + records[0]);
			$fieldTR.find("td.fieldEdit").append("<a href='/" + records[0].Id + "/e' target='_blank'>Edit</a>");
		});
	}
	
}

function LoadFieldValuesPreview(e)
{
	e.preventDefault();
	
	var oFormulaEditorSettings = editorJQuery(this).data("formulaEditorSettings");
	
	var sRecordId = oFormulaEditorSettings.FieldValuesPreviewInput.val();
	
	if (sRecordId.trim() == "")
	{
		alert("Please enter a record id.");
		return false;
	}
	
	//LOOP OVER FIELD DETAIL TABLE ROWS AND BUILD SOQL QUERY
	var oFields = [];
	oFormulaEditorSettings.FieldsTable.find("> tbody > tr.fieldRow > td.fieldPath").each(function()
	{
		oFields.push(editorJQuery(this).text());
	});	
	
	jsforceConnection.query("SELECT Id, Name, " + oFields.join(",") + " FROM " + oFormulaEditorSettings.ObjectAPIName + " WHERE Id = '" + sRecordId + "'", function(err, result) {
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
			oFormulaEditorSettings.FieldsTable.find("> tbody > tr#field" + f).find("td.fieldValue").text(oCurrentRecordPart);
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




