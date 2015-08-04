editAreaLoader.window_loaded();

var sId = "";
var sObjectElementId = "";
if (document.getElementById("CalculatedFormula") != null)
{
	//FORMULA FIELD, WORKFLOW FIELD UPDATE FORMULA (DOES NOT WORK)
	sId = "CalculatedFormula";
	sObjectElementId = "entity";
}
else if (document.getElementById("formulaTextArea") != null)
{
	//WORKFLOW RULE FORMULA
	sId = "formulaTextArea";
	sObjectElementId = "TableEnumOrId";
}
else if (document.getElementById("ValidationFormula") != null)
{
	//VALIDATION RULE
	sId = "ValidationFormula";
	sObjectElementId = "TableEnumOrId";
}

var oFormulaEditorSettings = {
	TextAreaId: sId,
	TextAreaEditorHeight: 400,
	TextAreaEditorDisplay: "onload",	
	TextAreaEditorEditable: true,
	OverrideInsertButtons: true,
	LoadFieldDetailsAfterSelector: ".formulaFooter"
}

//custom objects have their object id in the entity field, standard objects have their object name
var $objectIdField = editorJQuery("#" + sObjectElementId);
if ($objectIdField.length == 1)
{
	if ($objectIdField.val().charAt(0) == "0")
	{
		oFormulaEditorSettings.ObjectId = $objectIdField.val();
	}
	else
	{
		oFormulaEditorSettings.ObjectAPIName = $objectIdField.val();
	}
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
		TextAreaEditorEditable: true,
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
	editorJQuery("#" + oFormulaEditorSettings.TextAreaId).data("originalFormula", editorJQuery("#" + oFormulaEditorSettings.TextAreaId).val());
	
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
		,is_editable: oFormulaEditorSettings.TextAreaEditorEditable
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
	
	//SETUP FIELD DETAILS IF WE CAN IDENTIFY WHAT OBJECT WE ARE WORKING WITH
	if (oFormulaEditorSettings.ObjectId != "" || oFormulaEditorSettings.ObjectAPIName != "")
	{
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
		
		if (oFormulaEditorSettings.ObjectId != "")
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
		else if (oFormulaEditorSettings.ObjectAPIName != "")
		{
			//LOAD CURRENT OBJECT FIELDS
			jsforceConnection.sobject(oFormulaEditorSettings.ObjectAPIName).describe$(function(err, meta) {
				if (err) { return console.error(err); }
				oFormulaEditorSettings.ObjectFields = meta.fields;
			});
		}
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
	
	var sFormula = editAreaLoader.getValue(oFormulaEditorSettings.TextAreaId);
	var oFields = GetFieldsFromFormula(sFormula);
	
	//ADD THE CURRENT FIELD WE ARE EDITING SO WE CAN TEST ITS VALUE AS WELL
	if (sId == "CalculatedFormula" && oFormulaEditorSettings.OverrideInsertButtons == true)
	{
		var sThisFieldName = editorJQuery("#DeveloperName").val() + "__c";
		oFields.push({
			Field: sThisFieldName,
			FieldParts: sThisFieldName.split("."),
			Quantity: "",
			ThisField: true
		});
	}
	
	//LOAD THE TABLE	
	var $table = oFormulaEditorSettings.FieldsTable;
	
	$table.empty();
	
	$table.append("<tr class='headerRow'><th>Field</th><th>Type</th><th>Details</th><th>Quantity</th><th><a class='formulaFieldCompile' href='#' style='text-decoration: underline;' title='Click to load the compile sizes of referenced formula fields.'>Compile</a></th><th>Edit</th><th>Value</th></tr>");

	//LOOP OVER EACH FIELD PATH AND IDENTIFY WHAT FINAL FIELD IT REPRESENTS
	for (var i = 0; i < oFields.length; i++)
	{
		var oFieldParts = oFields[i].FieldParts;
				
		var $fieldTR = editorJQuery("<tr id='field" + i + "' data-fieldIndex='" + i + "' class='fieldRow'><td class='fieldPath'>" + oFields[i].Field + "</td><td class='fieldType'></td><td class='fieldDetails'></td><td class='fieldQuantity'>" + oFields[i].Quantity + "</td><td class='fieldCompile'></td><td class='fieldEdit'></td><td class='fieldValue'></td></tr>");
		$table.append($fieldTR);
		
		if (oFields[i].ThisField == false)
		{
			FindFieldDescribeRecursive($fieldTR, null, oFormulaEditorSettings.ObjectAPIName, i, oFieldParts, 0, oFormulaEditorSettings.ObjectFields);
		}
		else
		{
			$fieldTR.addClass("thisField").css("background-color", "#818290").find("td.fieldPath").text(oFields[i].Field);
			$fieldTR.find("td").css("color", "#FFFFFF");
		}
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
function FindFieldDescribeRecursive($fieldTR, sObjectLookupFieldName, sObjectName, iFieldIndex, oFieldParts, iFieldPartIndex, oCurrentFieldPartFields)
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
			
			//IF WE HAVE MORE RELATIONSHIPS TO WORK THROUGH
			if (iFieldPartIndex != oFieldParts.length - 1)
			{
				console.log("requesting relationship fields: " + oFieldDescribe.referenceTo[0]);
				jsforceConnection.sobject(oFieldDescribe.referenceTo[0]).describe$(function(err, meta) {
					if (err) { return console.error(err); }
					iFieldPartIndex += 1;
					console.log(meta);
					return FindFieldDescribeRecursive($fieldTR, oFieldDescribe.name, oFieldDescribe.referenceTo[0], iFieldIndex, oFieldParts, iFieldPartIndex, meta.fields);
				});
			}
			else
			{
				UpdateFieldDetails($fieldTR, sObjectLookupFieldName, sObjectName, iFieldIndex, oFieldParts, oFieldDescribe);
			}
		}
	}
}

function UpdateFieldDetails($fieldTR, sObjectLookupFieldName, sObjectName, iFieldIndex, oFieldParts, oFieldDescribe)
{
	console.log(oFieldDescribe);
	$fieldTR.data("fieldDescribe", oFieldDescribe);
	$fieldTR.data("objectName", sObjectName);
	$fieldTR.data("objectLookupFieldName", sObjectLookupFieldName);
	$fieldTR.find("td.fieldType").text(GetFriendlyFieldType(oFieldDescribe));
	
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
			TextAreaEditorEditable: true,
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
			$picklistTable.append("<tr><td>" + oFieldDescribe.picklistValues[v].label + "</td><td>" + ((oFieldDescribe.picklistValues[v].defaultValue == true) ? "Yes" : "No") + "</td></tr>");
		}
	}

	//GENERATE EDIT LINK
	//IF CUSTOM OBJECT THEN LOOKUP OBJECT ID FIRST, THEN LOOKUP CUSTOM FIELD ID
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
		//IF STANDARD OBJECT BUT CUSTOM FIELD THEN LOOKUP CUSTOM FIELD ID
		if (oFieldDescribe.name.indexOf("__c") > -1)
		{
			jsforceConnection.tooling.sobject('CustomField')
			.find({ TableEnumOrId: sObjectName, DeveloperName: oFieldDescribe.name.replace("__c", "") })
			.execute(function(err, records) {
				if (err) { return console.error(err); }
				console.log("fetched : " + records[0]);
				$fieldTR.find("td.fieldEdit").append("<a href='/" + records[0].Id + "/e' target='_blank'>Edit</a>");
			});
		}
		else
		{
			//IF STANDARD OBJECT AND STANDARD FIELD THEN GO TO STANDARD SALESFORCE URL
			var sURL = "/p/setup/field/StandardFieldAttributes/d?id=" + oFieldDescribe.name + "&type=" + sObjectName;
			$fieldTR.find("td.fieldEdit").append("<a href='" + sURL + "' target='_blank'>Edit</a>");
			
		}
	}
	
}

function GetFriendlyFieldType(oFieldDescribe)
{
	var sFieldType = "";
	
	if (oFieldDescribe.type == "boolean")
	{
		sFieldType = "Checkbox";
	}
	else if (oFieldDescribe.type == "currency")
	{
		sFieldType = "Currency";
	}
	else if (oFieldDescribe.type == "date")
	{
		sFieldType = "Date";
	}
	else if (oFieldDescribe.type == "datetime")
	{
		sFieldType = "Date/Time";
	}
	else if (oFieldDescribe.type == "double")
	{
		sFieldType = "Number";
	}	
	else if (oFieldDescribe.type == "email")
	{
		sFieldType = "Email";
	}	
	else if (oFieldDescribe.type == "percent")
	{
		sFieldType = "Percent";
	}
	else if (oFieldDescribe.type == "phone")
	{
		sFieldType = "Phone";
	}
	else if (oFieldDescribe.type == "picklist")
	{
		sFieldType = "Picklist";
	}

	else if (oFieldDescribe.type == "reference")
	{
		sFieldType = "Lookup (" + oFieldDescribe.referenceTo[0] + ")";
	}
	else
	{
		sFieldType = oFieldDescribe.type;
	}
	
	if (oFieldDescribe.precision > 0)
	{
		sFieldType += " (" + (oFieldDescribe.precision - oFieldDescribe.scale) + ", " + (oFieldDescribe.scale) + ")";
	}
	
	if (oFieldDescribe.calculatedFormula != null)
	{
		sFieldType = "Formula (" + sFieldType + ")";
	}
	
	return sFieldType;
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
	var oFormulaFieldParentFields = [];
	oFormulaEditorSettings.FieldsTable.find("> tbody > tr.fieldRow > td.fieldPath").each(function()
	{
		var sField = editorJQuery(this).text();
		oFields.push(sField);

		/* STILL NEED TO FIGURE OUT HOW TO REQUEST THE LOOKUP RECORD ID AND LOAD IT INTO SUB FORMULA FIELDS
		//DON'T ATTEMPT FOR THE FIELD THE FORMULA IS LOADED FROM
		if (editorJQuery(this).parent().is(".thisField") == false)
		{
			var oFieldDescribe = editorJQuery(this).parent().data("fieldDescribe");		
			if (oFieldDescribe.calculatedFormula != null)
			{			
				if (sField.indexOf(".") > -1)
				{
					var oFormulaFieldParentFieldParts = sField.split(".");
					oFormulaFieldParentFieldParts.pop();
					//ADD THE LOOK UP FIELD ITSELF SO WE CAN KNOW THE RECORD ID TO USE FOR SUB FORMULA FIELDS
					oFormulaFieldParentFields.push(oFormulaFieldParentFieldParts.join(".").replace("__r", "__c"));
				}
				else
				{
					oFormulaFieldParentFields.push("Id");
				}
			}
		}
		*/

	});
	
	var oRequestFields = oFields.concat(oFormulaFieldParentFields);
	var oUniqueRequestFields = [];
	editorJQuery.each(oRequestFields, function(i, el){
			if(editorJQuery.inArray(el, oUniqueRequestFields) === -1) oUniqueRequestFields.push(el);
	});
	
	
	jsforceConnection.query("SELECT " + oUniqueRequestFields.join(",") + " FROM " + oFormulaEditorSettings.ObjectAPIName + " WHERE Id = '" + sRecordId + "'", function(err, result) {
		if (err) { return console.error(err); }
		var oRecord = result.records[0];
		console.log(oRecord);
		for (var f = 0; f < oFields.length; f++)
		{
			var oFieldParts = oFields[f].split(".");
			//WORK OUR WAY THROUGH THE FIELD RELATIONSHIPS ON THE RESULT RECORD
			var oCurrentRecordPart = oRecord;
			for (var p = 0; p < oFieldParts.length; p++)
			{
				oCurrentRecordPart = oCurrentRecordPart[oFieldParts[p]];
			}
			var $trField = oFormulaEditorSettings.FieldsTable.find("> tbody > tr#field" + f);
			$trField.find("td.fieldValue").text(oCurrentRecordPart);
			
			/*
			//ATTEMPT TO LOAD THE SUB FORMULA RECORD ID
			var oFieldDescribe = editorJQuery(this).parent().data("fieldDescribe");
			
			if (oFieldDescribe.calculatedFormula != null)
			{
				var sFormulaFieldParentField = sField.split(".").pop().join(".").replace("__r", "__c")
				
				var oParentFieldParts = sFormulaFieldParentField.split(".");
				//WORK OUR WAY THROUGH THE FIELD RELATIONSHIPS ON THE RESULT RECORD
				var oCurrentParentRecordPart = oParentRecord;
				for (var p = 0; p < oParentFieldParts.length; p++)
				{
					oCurrentParentRecordPart = oCurrentParentRecordPart[oParentFieldParts[p]];
				}
				$trField.next().find(".fieldValuesPreviewId:first").text(oCurrentParentRecordPart);
			}
			*/
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
	for (var f = 0; f < oFields.length; f++)
	{
			var sField = oFields[f];
			var oUniqueField = null;
			//LOOK TO SEE IF WE FOUND THE FIELD ALREADY
			for (var u = 0; u < oUniqueFields.length; u++)
			{
				if (oUniqueFields[u].Field == sField)
				{
					oUniqueField = oUniqueFields[u];
					break;
				}
			}
			
			if (oUniqueField == null)
			{
				oUniqueFields.push({
					Field: sField,
					FieldParts: sField.split("."),
					Quantity: 1,
					ThisField: false
				});
			}
			else
			{
				oUniqueField.Quantity += 1;
			}
	}
	
	return oUniqueFields;
}




