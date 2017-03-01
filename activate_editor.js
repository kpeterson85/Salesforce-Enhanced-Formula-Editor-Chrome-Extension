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
	TextAreaEditorResizedCallback: "FormulaEditAreaResized",
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

var oEditorTooltipStyles = {
	"background-color": "#CCCCCC",
	"border-radius": "10px",
	"display": "inline-block",
	"height": "11px",
	"width": "11px",
	"text-align": "center",
	"cursor": "default",
	"margin-left": "3px",
	"font-size": "10px",
	"font-weight": "normal"
};

ActivateEditor(oFormulaEditorSettings);

function ActivateEditor(oFormulaEditorSettings)
{
	var oDefaultSettings = {
		TextAreaId: "",
		TextAreaEditorHeight: 400,
		TextAreaEditorDisplay: "onload",
		TextAreaEditorEditable: true,
		TextAreaEditorResizedCallback: "",
		ObjectId: "",
		ObjectAPIName: "",
		ObjectLabel: "",
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
		,EA_resized_callback: oFormulaEditorSettings.TextAreaEditorResizedCallback
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
		//ShowNewVersionMessage();
		
		var $fieldDetails = editorJQuery("<span class='formulaEditorFieldsLoadShell' style='float: left;'><input type='submit' class='btn formulaEditorFieldsLoad' value='Load Field Details' /><span class='formulaEditorTooltip' title='Loads details about the fields found in the formula.'>?</span></span><div class='formulaEditorFields' style='display: none;'><div class='fieldValuesPreviewShell' style='display: inline; text-align: right; float: right;'><input type='text' class='fieldValuesPreviewId' placeholder='Enter Record Id' /> <input type='button' class='fieldValuesPreviewButton btn' value='Load Record Values' /></div><table class='formulaEditorFieldsTable list'></table></div>");
					
		$loadButton = $fieldDetails.find("input.formulaEditorFieldsLoad");
		$loadButton.data("formulaEditorSettings", oFormulaEditorSettings);
		
		$fieldsShell = $fieldDetails.filter("div.formulaEditorFields");
		oFormulaEditorSettings.FieldsShell = $fieldsShell;
		
		$previewButton = $fieldDetails.find("input.fieldValuesPreviewButton");
		$previewButton.data("formulaEditorSettings", oFormulaEditorSettings);
		
		$previewInput = $fieldDetails.find("input.fieldValuesPreviewId");
		oFormulaEditorSettings.FieldValuesPreviewInput = $previewInput;
		
		$fieldsTable = $fieldDetails.find("table.formulaEditorFieldsTable");
		oFormulaEditorSettings.FieldsTable = $fieldsTable;
		
		if (oFormulaEditorSettings.OverrideInsertButtons == true)
		{
			$fieldDetails.find(".formulaEditorTooltip").css(oEditorTooltipStyles);
		}
		else
		{
			$fieldDetails.find(".formulaEditorTooltip").remove();
		}
		
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
					oFormulaEditorSettings.ObjectLabel = meta.label;
					oFormulaEditorSettings.ObjectFields = meta.fields;
				});
			});
		}
		else if (oFormulaEditorSettings.ObjectAPIName != "")
		{
			//LOAD CURRENT OBJECT FIELDS
			jsforceConnection.sobject(oFormulaEditorSettings.ObjectAPIName).describe$(function(err, meta) {
				if (err) { return console.error(err); }
				oFormulaEditorSettings.ObjectLabel = meta.label;
				oFormulaEditorSettings.ObjectFields = meta.fields;
			});
		}
	}
}

function FormulaEditAreaResized(sTextAreaId)
{
	alert("resized " + sTextAreaId);
}

//http://stackoverflow.com/questions/2399389/detect-chrome-extension-first-run-update
function ShowNewVersionMessage()
{
	var bMessageSeen = localStorage['FormulaEditorFieldDetailsMessageSeen'];
	if (typeof bMessageSeen == "undefined")
	{
		var $overlay = editorJQuery("<div id='formulaEditorMessageOverlay'></div>")
		.css({
			"background": "#000000",
			"position": "fixed",
			"top": "0",
			"left": "0",
			"width": "100%",
			"height": "1000%",
			"z-index": "99999",
			"opacity": ".6"
		}).appendTo("body");
		
		var $messageBox = editorJQuery("<div id='formulaEditorMessageBox'></div>")
		.css({
			"position": "fixed",
			"top": "100px",
			"background": "#FFFFFF",
			"z-index": "99999",
			"left": "50%",
			"width": "500px",
			"margin-left": "-250px", //half of width
			"padding": "10px",
			"border-radius": "5px"
		}).appendTo("body");	
		
		var sBaseURL = editorJQuery("#ForceFormulaEditorBaseURL").val();
		
		$messageBox.append("<h1 style='font-size: 20px;'>Enhanced Formula Editor Updates</h1>");
		$messageBox.append("<p style='margin: 5px 0 10px 0;'>There are some exciting updates to the enhanced formula editor!</p>");
		$messageBox.append("<h2 style='font-size: 15px;'>Insert Field, Insert Operator, and Insert Function Buttons</h2>");
		$messageBox.append("<p style='margin: 5px 0 10px 0;'>The \"Insert\" buttons now properly insert content into the editor.</p>");
		$messageBox.append("<h2 style='font-size: 15px;'>\"Load Field Details\" Button</h2>");
		$messageBox.append("<p style='margin: 5px 0 10px 0;'>There is a new button under the editor named \"Load Field Details\" that loads details about the fields found in the formula.  The field details included are:<p>");
		var sList = "<ul style='list-style-type: disc;'>";
		sList += "<li>Field type</li>";
		sList += "<li>How many times it is used</li>";
		sList += "<li>Formula field compile sizes</li>";
		sList += "<li>Field edit links</li>";
		sList += "<li>Field record values</li>";
		sList += "<li>Field Sub Details";
			sList += "<ul style='list-style-type: circle;'>";
			sList += "<li>Object Name</li>";
			sList += "<li>Field Label</li>";
			sList += "<li>Field Help Text</li>";
			sList += "<li>For picklist fields, their picklist values</li>";
			sList += "<li>For formula fields, their formula</li>";
			sList += "</ul>";
		sList += "</li>";
		sList += "</ul>";
		$messageBox.append(sList);
		$messageBox.append("<img src='" + sBaseURL + "FieldDetailsScreenshot.jpg' style='width: 100%; border: 1px solid #CCCCCC; margin-top: 10px;' />");
		$messageBox.append("<a href='#' id='formulaEditorMessageBoxConfirm'>Got It!</a>");
		
		$messageBox.find("#formulaEditorMessageBoxConfirm")
		.css({
			"float": "right",
			"border": "1px solid #000000",
			"border-radius": "5px",
			"padding": "5px 10px",
			"text-decoration": "none",
			"background": "#EEE",
			"margin-top": "10px"
		})
		.click(function()
		{
			$overlay.hide();
			$messageBox.hide();
			
			localStorage['FormulaEditorFieldDetailsMessageSeen'] = true;
			
			return false;
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
	
	if (oFormulaEditorSettings.ObjectFields == null)
	{
		//USER CLICKED THE LOAD BUTTON TOO QUICK, STILL WAITING FOR THE CURRENT OBJECT META DATA TO LOAD
		return false;
	}
	
	var sFormula = editAreaLoader.getValue(oFormulaEditorSettings.TextAreaId);
	var oFields = GetFieldsFromFormula(sFormula);
	
	//ADD THE CURRENT FIELD WE ARE EDITING SO WE CAN TEST ITS VALUE AS WELL
	if (sId == "CalculatedFormula" && oFormulaEditorSettings.OverrideInsertButtons == true)
	{
		var sResultFieldName = editorJQuery("#DeveloperName").val() + "__c";
		oFields.push({
			Field: sResultFieldName,
			FieldParts: sResultFieldName.split("."),
			Quantity: "",
			ResultField: true
		});
	}
	
	//LOAD THE TABLE	
	var $table = oFormulaEditorSettings.FieldsTable;
	
	$table.empty();
	
	$table.append("<tr class='headerRow'><th width='11'></th><th>Field</th><th>Type</th><th>Quantity</th><th><a class='formulaFieldCompile' href='#' style='text-decoration: underline;'>Compile</a><span class='formulaEditorTooltip' title='Click the link to load the compile sizes of referenced formula fields.'>?</span></th><th><a class='loadFieldEditLinks' href='#' style='text-decoration: underline;'>Edit</a><span class='formulaEditorTooltip' title='Click the link to load the edit links for the fields.'>?</span></th><th>Value <span class='formulaEditorTooltip' title='Enter a record id above and click the Load Record Values button to see the values of the fields below.'>?</span></th></tr>");

	//APPLY TOOLTIP STYLES THIS WAY SO WE DON'T HAVE TO ADD STYLESHEET TO PAGE
	$table.find(".formulaEditorTooltip").css(oEditorTooltipStyles);
	
	//LOOP OVER EACH FIELD PATH AND IDENTIFY WHAT FINAL FIELD IT REPRESENTS
	for (var i = 0; i < oFields.length; i++)
	{
		var oFieldParts = oFields[i].FieldParts;
				
		var $fieldTR = editorJQuery("<tr id='field" + i + "' data-fieldIndex='" + i + "' class='fieldRow'><td class='fieldDetails' valign='middle' align='center'></td><td class='fieldPath'>" + oFields[i].Field + "</td><td class='fieldType'></td><td class='fieldQuantity'>" + oFields[i].Quantity + "</td><td class='fieldCompile'></td><td class='fieldEdit'></td><td class='fieldValue'></td></tr>");
		$table.append($fieldTR);
		
		if (oFields[i].ResultField == true)
		{
			$fieldTR.addClass("resultField").addClass("valueField").css("background-color", "#818290").find("td.fieldPath").text(oFields[i].Field);
			$fieldTR.find("td").css("color", "#FFFFFF");
		}
		else if (oFields[i].Field.indexOf("$") === 0)
		{
			$fieldTR.addClass("systemField").find("td.fieldPath").text(oFields[i].Field);
			$fieldTR.find("td.fieldType").text("System");
		}
		else
		{
			$fieldTR.addClass("detailField").addClass("valueField")
			FindFieldDescribeRecursive($fieldTR, null, oFormulaEditorSettings.ObjectAPIName, i, oFieldParts, 0, oFormulaEditorSettings.ObjectFields);
		}
	}
	
	$table.find("tr.headerRow a.formulaFieldCompile").click(function()
	{
		//make sure the Edit links have been loaded first
		if ($table.find("> tbody > tr.formulaField > td.fieldEdit:empty").length == 0)
		{			
			$table.find("> tbody > tr.formulaField > td.fieldEdit").each(function()
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
			});
		}
		else
		{
			alert("Load the \"Edit\" links first by clicking the \"Edit\" header link.  Then click \"Compile\".");
		}
		
		return false;
	});
	
	$table.find("tr.headerRow a.loadFieldEditLinks").click(function()
	{
		//LOOP OVER EACH FIELD EXCEPT THE FIELD WE ARE EDITING
		$table.find("> tbody > tr.detailField").each(function()
		{
			var $fieldTR = editorJQuery(this);
			
			var oFieldDescribe = $fieldTR.data("fieldDescribe");
			var sObjectName = $fieldTR.data("objectName");
			
			//GENERATE EDIT LINK
			//IF CUSTOM OBJECT THEN LOOKUP OBJECT ID FIRST, THEN LOOKUP CUSTOM FIELD ID
			if (sObjectName.indexOf("__c") > -1)
			{
				jsforceConnection.tooling.sobject('CustomObject')
				.find({ DeveloperName: sObjectName.replace("__c", "") })
				.execute(function(err, records) {
					if (err) { return console.error(err); }
					//console.log("fetched : " + records);
					jsforceConnection.tooling.sobject('CustomField')
					.find({ TableEnumOrId: records[0].Id, DeveloperName: oFieldDescribe.name.replace("__c", "") })
					.execute(function(err, records) {
						if (err) { return console.error(err); }
						//console.log("fetched : " + records[0]);
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
						//console.log("fetched : " + records[0]);
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
				//console.log("requesting relationship fields: " + oFieldDescribe.referenceTo[0]);
				jsforceConnection.sobject(oFieldDescribe.referenceTo[0]).describe$(function(err, meta) {
					if (err) { return console.error(err); }
					iFieldPartIndex += 1;
					//console.log(meta);
					return FindFieldDescribeRecursive($fieldTR, oFieldDescribe.name, oFieldDescribe.referenceTo[0], iFieldIndex, oFieldParts, iFieldPartIndex, meta.fields);
				});
			}
			else
			{
				UpdateFieldDetails($fieldTR, sObjectLookupFieldName, sObjectName, iFieldIndex, oFieldParts, oFieldDescribe);
			}
		}
	}
	
	if (oFieldDescribe == null)
	{
		$fieldTR.find("td.fieldType").html("Not Found <span class='formulaEditorTooltip' title='The field could not be found because you do not have access to it on the object.'>?</span>").find(".formulaEditorTooltip").css(oEditorTooltipStyles);
	}
}

function UpdateFieldDetails($fieldTR, sObjectLookupFieldName, sObjectName, iFieldIndex, oFieldParts, oFieldDescribe)
{
	//console.log(oFieldDescribe);
	$fieldTR.data("fieldDescribe", oFieldDescribe);
	$fieldTR.data("objectName", sObjectName);
	$fieldTR.data("objectLookupFieldName", sObjectLookupFieldName);
	$fieldTR.find("td.fieldDetails").append("<img class='fieldDetailsToggle' style='cursor: pointer; margin-top: 1px;' data-state='collapsed' src='/img/alohaSkin/setup/setup_plus_lev1.gif' />");
	$fieldTR.find("td.fieldType").text(GetFriendlyFieldType(oFieldDescribe));
	
	var $detailsViewLink = $fieldTR.find("td.fieldDetails img.fieldDetailsToggle");
	$detailsViewLink.click(function()
	{
		if ($detailsViewLink.attr("data-state") == "collapsed")
		{
			editorJQuery(this).closest("tr").next().show();
			$detailsViewLink.attr("src", "/img/alohaSkin/setup/setup_minus_lev1.gif");
			$detailsViewLink.attr("data-state", "expanded");
			//attempt to turn on a formula editor if it exists
			editorJQuery(this).closest("tr").next().find("label:contains('Toggle editor')").prev().filter(":not(:checked)").click();
		}
		else
		{
			editorJQuery(this).closest("tr").next().hide();
			$detailsViewLink.attr("src", "/img/alohaSkin/setup/setup_plus_lev1.gif");
			$detailsViewLink.attr("data-state", "collapsed");
		}
		return false;
	});
	
	var $fieldDetailsTR = editorJQuery("<tr class='fieldDetailsRow' style='display: none;'><td style='padding-left: 20px;' colspan='" + $fieldTR.children().length + "'></td></tr>");
	$fieldTR.after($fieldDetailsTR);
	
	var $fieldDetailsTC = $fieldDetailsTR.children(0);
	var $detailsTable = editorJQuery("<table class='list'><tr class='headerRow'><th width='80'>Detail</th><th>Value</th></tr></table>");
	$fieldDetailsTC.append($detailsTable);
	
	$detailsTable.append("<tr><td>Object</td><td>" + sObjectName + "</td></tr>");
	$detailsTable.append("<tr><td>Label</td><td>" + oFieldDescribe.label + "</td></tr>");
	$detailsTable.append("<tr><td>Help Text</td><td>" + ((oFieldDescribe.inlineHelpText != null) ? oFieldDescribe.inlineHelpText : "")  + "</td></tr>");
	
	if (oFieldDescribe.calculatedFormula != null)
	{
		$fieldTR.addClass("formulaField");
		
		var sTextAreaId = sObjectName+"-"+oFieldDescribe.name;
		$detailsTable.append("<tr><td>Formula</td><td><textarea id='" + sTextAreaId + "' cols='80' rows='10' style='width: 99%; height: 15em;' wrap='soft'></textarea><div id='"+sTextAreaId+"Footer'></div></td></tr>");
		editorJQuery("#" + sTextAreaId).val(oFieldDescribe.calculatedFormula);
		
		var oSubFormulaEditorSettings = {
			TextAreaId: sTextAreaId,
			TextAreaEditorHeight: 250,
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
	oFormulaEditorSettings.FieldsTable.find("> tbody > tr.valueField > td.fieldPath").each(function()
	{
		var sField = editorJQuery(this).text();
		oFields.push(sField);

		/* STILL NEED TO FIGURE OUT HOW TO REQUEST THE LOOKUP RECORD ID AND LOAD IT INTO SUB FORMULA FIELDS
		//DON'T ATTEMPT FOR THE FIELD THE FORMULA IS LOADED FROM
		if (editorJQuery(this).parent().is(".resultField") == false)
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
		//console.log(oRecord);
		oFormulaEditorSettings.FieldsTable.find("> tbody > tr.valueField > td.fieldPath").each(function()
		{
			var sField = editorJQuery(this).text();
			var oFieldParts = sField.split(".");
			//WORK OUR WAY THROUGH THE FIELD RELATIONSHIPS ON THE RESULT RECORD
			var oCurrentRecordPart = oRecord;
			for (var p = 0; p < oFieldParts.length; p++)
			{
				oCurrentRecordPart = oCurrentRecordPart[oFieldParts[p]];
			}
			var $trField = editorJQuery(this).parent();
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
		});
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
	sFormula = sFormula.replace(/(\bABS\b|\bBEGINS\b|\bBLANKVALUE\b|\bBR\b|\bCASESAFEID\b|\bCEILING\b|\bCONTAINS\b|\bDATE\b|\bDATETIMEVALUE\b|\bDATEVALUE\b|\bDAY\b|\bDISTANCE\b|\bEXP\b|\bFIND\b|\bFLOOR\b|\bGEOLOCATION\b|\bGETSESSIONID\b|\bHYPERLINK\b|\bIMAGE\b|\bINCLUDES\b|\bISBLANK\b|\bISCHANGED\b|\bISNEW\b|\bISNULL\b|\bISNUMBER\b|\bISPICKVAL\b|\bLEFT\b|\bLEN\b|\bLN\b|\bLOG\b|\bLOWER\b|\bLPAD\b|\bMAX\b|\bMID\b|\bMIN\b|\bMOD\b|\bMONTH\b|\bNOT\b|\bNOW\b|\bNULLVALUE\b|\bPRIORVALUE\b|\bREGEX\b|\bRIGHT\b|\bROUND\b|\bRPAD\b|\bSQRT\b|\bSUBSTITUTE\b|\bTEXT\b|\bTODAY\b|\bTRIM\b|\bUPPER\b|\bVALUE\b|\bVLOOKUP\b|\bYEAR\b)/ig, " ");
	
	//BOOLEAN
	sFormula = sFormula.replace(/(\bAND\b|\bCASE\b|\bIF\b|\bOR\b|\&\&|\|\|)/ig, " ");
	
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
					ResultField: false
				});
			}
			else
			{
				oUniqueField.Quantity += 1;
			}
	}
	
	return oUniqueFields;
}




