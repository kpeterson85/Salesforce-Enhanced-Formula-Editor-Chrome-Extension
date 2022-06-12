//console.log("activate_editor loaded");

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

//some pages like 'add formula field' pages have hidden inputs
//with the same id's as above so we must specify that it's a text area
if (sId != "" && document.getElementById(sId).tagName == "TEXTAREA")
{
	var elements = editorJQuery('#' + sId);
	if (elements.length == 1)
	{
		//console.log("Found direct formula field");
		ActivateWhenTextFieldsVisible(elements[0]);
	}
}

function ActivateWhenTextFieldsVisible(eTextfield)
{
	var observer = new IntersectionObserver(function(entries)
	{		
		//only activate the editor when the textfield becomes visible the first time indicated by lack of data attached yet
		if (entries[0].intersectionRatio && typeof(editorJQuery(entries[0].target).data("formulaEditorSettings")) == "undefined")
		{
			//don't observe anymore
			observer.unobserve(entries[0].target);
			
			var parent = entries[0].target.parentNode;
			
			var oFormulaEditorSettings = {
				TextAreaId: entries[0].target.getAttribute("id"),
				TextAreaEditorStartHeight: 400,
				TextAreaEditorStartWidth: 650,
				TextAreaEditorDisplay: "onload",	
				TextAreaEditorEditable: true,
				TextAreaEditorResizedCallback: "FormulaEditAreaResized",
				TextAreaEditorFontSizeChangedCallback: "FormulaEditAreaFontSizeChanged",
				TextAreaEditorFontFamilyChangedCallback: "FormulaEditAreaFontFamilyChanged",
				OverrideInsertButtons: true,
				LoadFieldDetailsAfterSelector: "#frame_" + entries[0].target.getAttribute("id"),
				ParentElement: parent,
				OriginalFormulaCode: entries[0].target.value
			}

			if (typeof(localStorage['FormulaEditorHeight']) != "undefined")
			{
				oFormulaEditorSettings.TextAreaEditorStartHeight = parseInt(localStorage['FormulaEditorHeight'], 10);
			}
			if (typeof(localStorage['FormulaEditorWidth']) != "undefined")
			{
				oFormulaEditorSettings.TextAreaEditorStartWidth = parseInt(localStorage['FormulaEditorWidth'], 10);
			}
			if (typeof(entries[0].target.getAttribute("data-editor-popup")) != "undefined" && entries[0].target.getAttribute("data-editor-popup") == "true")
			{
				oFormulaEditorSettings.Popup = true;
			}
			else
			{
				//IF NOT IN A POPUP LIKE FLOW/PROCESSBUILDER THEN DO LIVE VALIDATING
				oFormulaEditorSettings.TextAreaEditorChangeCallback = "FormulaEditAreaChanged"
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
			
			var sAccessToken = readCookie("sid");
			
			//IF SESSION ID COOKIE IS NOT PRESENT BECAUSE OF THE 'REQUIRE HTTP ONLY' SECURITY SETTING, THEN CHECK IF WE HAVE AN OAUTH ACCESS TOKEN AVAILABLE
			if (sAccessToken == null)
			{
				sAccessToken = document.getElementById("hdnFormulaEditorAccessToken").value;	
			}
			
			//CONNECT TO SALESFORCE
			//CHECK FOR AVAILABLE VERSION BY CALLING https://[custom subdomain].my.salesforce.com/services/data/ WITH AUTHORIZATION BEARER TOKEN
			window.jsforceConnection = new jsforce.Connection({
				serverUrl : "https://" + document.location.host,
				sessionId : sAccessToken,
				version: "55.0"
			});

			ActivateEditor(oFormulaEditorSettings);
			
				
			
		}
	},
	{
		root: eTextfield.parentNode
	});
	observer.observe(eTextfield);
}

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

function ActivateEditor(oFormulaEditorSettings)
{
	var oDefaultSettings = {
		TextAreaId: "",
		TextAreaEditorStartHeight: 400,
		TextAreaEditorMinHeight: 250,
		TextAreaEditorStartWidth: 650,
		TextAreaEditorMinWidth: 500,
		TextAreaEditorDisplay: "onload",
		TextAreaEditorEditable: true,
		TextAreaEditorResizedCallback: "",
		TextAreaEditorFontSizeChangedCallback: "",
		TextAreaEditorFontFamilyChangedCallback: "",
		Popup: false,
		ObjectId: "",
		ObjectAPIName: "",
		ObjectLabel: "",
		ObjectFields: null,
		FieldDetailsShellId: "",
		OverrideInsertButtons: false,
		LoadFieldDetailsAfterSelector: "",
		FieldsShell: null,
		FieldsTable: null,
		FieldValuesPreviewInput: null,
		ParentElement: document,
		OriginalFormulaCode: "",
		TextAreaEditorChangeCallback: ""
	}
	
	oFormulaEditorSettings = editorJQuery.extend(oDefaultSettings, oFormulaEditorSettings);
	
	editorJQuery("#" + oFormulaEditorSettings.TextAreaId, oFormulaEditorSettings.ParentElement).data("formulaEditorSettings", oFormulaEditorSettings);
	editorJQuery("#" + oFormulaEditorSettings.TextAreaId, oFormulaEditorSettings.ParentElement).data("originalFormula", editorJQuery("#" + oFormulaEditorSettings.TextAreaId, oFormulaEditorSettings.ParentElement).val());
	editorJQuery("#" + oFormulaEditorSettings.TextAreaId, oFormulaEditorSettings.ParentElement).width(oFormulaEditorSettings.TextAreaEditorStartWidth);
	editorJQuery("#" + oFormulaEditorSettings.TextAreaId, oFormulaEditorSettings.ParentElement).height(oFormulaEditorSettings.TextAreaEditorStartHeight);
	
	var sFontSize = "9";
	if (typeof(localStorage['FormulaEditorFontSize']) != "undefined")
	{
		sFontSize = localStorage['FormulaEditorFontSize'];
	}
	
	var sFontFamily = "Verdana";
	if (typeof(localStorage['FormulaEditorFontFamily']) != "undefined")
	{
		sFontFamily = localStorage['FormulaEditorFontFamily'];
	}
	
	FormulaEditAreaInit();
	
	function FormulaEditAreaInit()
	{
		editAreaLoader.init({
			id: oFormulaEditorSettings.TextAreaId	// id of the textarea to transform		
			,start_highlight: true	// if start with highlight
			,allow_resize: "both"
			,allow_toggle: true
			,word_wrap: false
			,language: "en"
			,syntax: "forceformula"
			,replace_tab_by_spaces: 2
			,font_size: sFontSize
			,font_family: sFontFamily
			,min_height: oFormulaEditorSettings.TextAreaEditorMinHeight
			,min_width: oFormulaEditorSettings.TextAreaEditorMinWidth		
			,show_line_colors: true
			,EA_load_callback: "FormulaEditAreaLoaded"
			,EA_resized_callback: oFormulaEditorSettings.TextAreaEditorResizedCallback
			,EA_font_size_changed_callback: oFormulaEditorSettings.TextAreaEditorFontSizeChangedCallback
			,EA_font_family_changed_callback: oFormulaEditorSettings.TextAreaEditorFontFamilyChangedCallback
			,display: oFormulaEditorSettings.TextAreaEditorDisplay
			,is_editable: oFormulaEditorSettings.TextAreaEditorEditable
			,parent: oFormulaEditorSettings.ParentElement
			,fullscreen: oFormulaEditorSettings.Popup
			,plugins: "autocompletion"
			,autocompletion: true
			,toolbar: "search,fullscreen,word_wrap,|,undo,redo,|,select_fontfamily,select_fontsize"
			,EA_change_callback: oFormulaEditorSettings.TextAreaEditorChangeCallback
		});
	}
}


function FormulaEditAreaLoaded(sTextAreaId)
{
	var oFormulaEditorSettings = editorJQuery(editAreas[sTextAreaId].textarea).data("formulaEditorSettings");
	
	//execute this manually because chrome doesn't recognize off on intial load?
	//the textarea[wrap=off] useragent styles don't apply initially for some reason
	editAreaLoader.execCommand(oFormulaEditorSettings.TextAreaId, 'set_word_wrap', true);
	editAreaLoader.execCommand(oFormulaEditorSettings.TextAreaId, 'set_word_wrap', false);
	
	if (oFormulaEditorSettings.OverrideInsertButtons == true)
	{
		//backup the standard salesforce insert function
		if (typeof(insertTextAtSelectionInEditor) != "undefined")
		{
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
	}
	
	var $fieldDetails = editorJQuery("<br><div class='formulaEditorValidation' style='display: none; padding: 4px 26px 4px 8px; margin: 2px 0; background-position: right 3px top 2px; background-repeat: no-repeat; border: 1px solid #AAA;'>Checking Syntax</div><div class='formulaEditorFields' style='display: none;'><div class='formulaEditorError' style='display: none; clear: both; background: #f8d7da; padding: 5px; border: 1px solid #ff808d; border-radius: 5px;'></div><div class='formulaEditorWarning' style='display: none; clear: both; color: #856404; background-color: #fff3cd; padding: 5px; border: 1px solid #ffe699; border-radius: 5px;'></div><table class='formulaEditorFieldsTable list'></table><div class='fieldValuesPreviewShell' style='display: inline; text-align: right; float: right;'><input type='text' class='fieldValuesPreviewId' placeholder='Enter Record Id' /> <input type='button' class='fieldValuesPreviewButton btn' value='Load Record Values' /></div></div>");
	editorJQuery(oFormulaEditorSettings.LoadFieldDetailsAfterSelector).after($fieldDetails);
	
	//SETUP FIELD DETAILS IF WE CAN IDENTIFY WHAT OBJECT WE ARE WORKING WITH
	if (oFormulaEditorSettings.ObjectId != "" || oFormulaEditorSettings.ObjectAPIName != "")
	{
		//ShowNewVersionMessage();
		
		var $loadButton = editorJQuery("<input type='button' value='Analyze Fields' class='btnLoadFieldDetails' style='float: left; margin: 1px 0 0 2px; padding: 0 2px;' />");
		editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").append($loadButton);
		
		
		$loadButton.data("formulaEditorSettings", oFormulaEditorSettings);
		
		$fieldsShell = $fieldDetails.filter("div.formulaEditorFields");
		oFormulaEditorSettings.FieldsShell = $fieldsShell;
		
		$previewButton = $fieldDetails.find("input.fieldValuesPreviewButton");
		$previewButton.data("formulaEditorSettings", oFormulaEditorSettings);
		
		$previewInput = $fieldDetails.find("input.fieldValuesPreviewId");
		oFormulaEditorSettings.FieldValuesPreviewInput = $previewInput;
		
		$fieldsTable = $fieldDetails.find("table.formulaEditorFieldsTable");
		oFormulaEditorSettings.FieldsTable = $fieldsTable;		
		
		$loadButton.click(LoadFormulaFieldDetails);
		
		$previewButton.click(LoadFieldValuesPreview);
		
		var sOptionsURL = "";		
		if (typeof(document.getElementById("hdnFormulaEditorOptionsURL")) != "undefined" && document.getElementById("hdnFormulaEditorOptionsURL") != null)
		{
			sOptionsURL = document.getElementById("hdnFormulaEditorOptionsURL").value;
		}
		var sOptionsConnectAccountURL = sOptionsURL + "?connect=1";
		var sUnableToAccessAPI = "Unable to access the Salesforce API. Please click the button below to grant the extension API access so field and record data can be loaded. Salesforce will prompt you to log in and accept/deny giving the Enhanced Formula Editor access.<br>" + "<a href='" + sOptionsConnectAccountURL + "' target='_blank' class='btn' style='color: #000; font-weight: normal; margin: 10px 5px 0px 0; display: inline-block; text-decoration: none; border: 1px solid #b5b5b5; background: #f3f2f2; border-radius: 3px; padding: 3px 4px;'>Grant Access</a>";
		
		if (oFormulaEditorSettings.ObjectId != "")
		{
			//LOOKUP CUSTOM OBJECT API NAME USING ITS OBJECT ID
			jsforceConnection.tooling.sobject('CustomObject')
			.find({ Id: oFormulaEditorSettings.ObjectId })
			.execute(function(err, records) {
				if (err)
				{
					if (err.errorCode == "INVALID_SESSION_ID")
					{
						$fieldsShell.find(".formulaEditorWarning").show().html(sUnableToAccessAPI);
					}
					else
					{
						$fieldsShell.find(".formulaEditorError").show().html("Error describing object '" + oFormulaEditorSettings.ObjectId + "'. It may only be accessible from a newer version of the API or you may not have meta data api access. Error message: " + err.message);
					}
					return console.error(err); //STOP FROM GOING ANY FURTHER SINCE WE WON'T BE ABLE TO DESCRIBE THE FIELDS
				}
				//console.log("fetched : " + records[0]);
				oFormulaEditorSettings.ObjectAPIName = records[0].DeveloperName + "__c";
				
				//LOAD CURRENT OBJECT FIELDS
				jsforceConnection.sobject(oFormulaEditorSettings.ObjectAPIName).describe$(function(err, meta)
				{
					if (err)
					{
						if (err.errorCode == "INVALID_SESSION_ID")
						{
							$fieldsShell.find(".formulaEditorWarning").show().html(sUnableToAccessAPI);
						}
						else
						{
							$fieldsShell.find(".formulaEditorError").show().html("Error describing object '" + oFormulaEditorSettings.ObjectAPIName + "'. It may only be accessible from a newer version of the API or you may not have meta data api access. Error message: " + err.message);
						}
						console.error(err);
						
					}
					else
					{
						oFormulaEditorSettings.ObjectLabel = meta.label;
						oFormulaEditorSettings.ObjectFields = meta.fields;
					}
				});
			});
		}
		else if (oFormulaEditorSettings.ObjectAPIName != "")
		{
			//LOAD CURRENT OBJECT FIELDS
			jsforceConnection.sobject(oFormulaEditorSettings.ObjectAPIName).describe$(function(err, meta)
			{
				if (err)
				{
					if (err.errorCode == "INVALID_SESSION_ID")
					{
						$fieldsShell.find(".formulaEditorWarning").show().html(sUnableToAccessAPI);
					}
					else
					{
						$fieldsShell.find(".formulaEditorError").show().html("Error describing object '" + oFormulaEditorSettings.ObjectAPIName + "'. It may only be accessible from a newer version of the API or you may not have meta data api access. Error message: " + err.message);
					}
					console.error(err);
				}
				else
				{
					oFormulaEditorSettings.ObjectLabel = meta.label;
					oFormulaEditorSettings.ObjectFields = meta.fields;
				}
			});
		}
	}
   
  //SETUP THE SAVE BUTTON FOR POPUP WINDOW EDITORS (PROCESS BUILDERS, FLOWS)
  //FIND THE EDITOR AND INJECT THE BUTTON, THE EDITOR IFRAME IS ALWAYS RIGHT AFTER THE TEXT AREA
  if (oFormulaEditorSettings.Popup == true)
  {
	  var $saveButton = editorJQuery("<input type='button' value='Save' class='btnSaveFormula' style='float: left; margin: 1px 0 0 2px; padding: 0 2px;' />");
	  $saveButton.click(function()
	  {
		//send a postmessage to the current window (the popup window) so that the contentscript postmessage handler can receive the updated formula and set it on the field
		window.postMessage({type: "FormulaEditorPopupSave", value: editAreaLoader.getValue(sTextAreaId) }, "*")
	  });
	  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").append($saveButton);
	  
	  /*
	  var $insertButton = editorJQuery("<input type='button' value='Insert Resource' class='btnInsertResource' style='float: left; margin: 1px 0 0 2px; padding: 0 2px;' />");
	  $insertButton.click(function()
	  {
		//send a postmessage to the current window (the popup window) so that the contentscript postmessage handler can receive the updated formula and set it on the field
		window.postMessage({type: "FormulaEditorPopupFlowInsertResource"}, "*")
	  });
	  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").append($insertButton);
	  
	  var $insertOptionsDiv = editorJQuery("<div class='divInsertResourceOptions' style='position: absolute; background: #FFF; border: 1px solid #000; z-index: 999; text-align: left; max-height: 70%; overflow: auto;'></div>");
	  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").append($insertOptionsDiv);
	  window.addEventListener("message", function(event)
	  {
		if (event.data.hasOwnProperty("type") && event.data.type == "FormulaEditorPopupFlowInsertResourceOptions")
		{
			$insertOptionsDiv.empty();
			for (var g = 0; g < event.data.options.OptionGroups.length; g++)
			{
				$insertOptionsDiv.append("<div>" + event.data.options.OptionGroups[g].Name + "</div>");
				var $ul = editorJQuery("<ul></ul>");
				for (var i = 0; i < event.data.options.OptionGroups[g].Options.length; i++)
				{
					var $li = editorJQuery("<li id='" + event.data.options.OptionGroups[g].Options[i].Id + "'>" + event.data.options.OptionGroups[g].Options[i].Text + "</li>");
					$li.click(function()
					{
						window.postMessage({type: "FormulaEditorPopupFlowInsertResourceOptionSelected", id: this.getAttribute("id")}, "*")
					});
					$ul.append($li);
				}
				$insertOptionsDiv.append($ul);
			}
		}
	  });
	  */
  }  
  
  //DON'T PROVIDE THE FORMAT BUTTON FOR POPUP EDITORS (PROCESS BUILDER, FLOWS) UNTIL WE HAVE TESTED IT MORE
  if (oFormulaEditorSettings.Popup == false)
  {
	  //SETUP THE FORMAT BUTTON
	  //FIND THE EDITOR AND INJECT THE FORMAT BUTTON, THE EDITOR IFRAME IS ALWAYS RIGHT AFTER THE TEXT AREA
	  var $formatButton = editorJQuery("<input type='button' value='Format' class='btnFormatFormula' style='float: left; margin: 1px 0 0 2px; padding: 0 2px;' />");
	  $formatButton.click(function()
	  {
		formatFormula(sTextAreaId);
	  });
	  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").append($formatButton);
  }
  

  //ONLY PROVIDE THE REVIEW CHANGES BUTTON IF IT IS THE MAIN EDITOR ON THE PAGE (NOT SUB FORMULA EDITORS) SINCE
  //USERS WON'T BE EDITING AND SAVING SUB FORMULAS
  if (oFormulaEditorSettings.OverrideInsertButtons == true)
  {
	  //SETUP THE REVIEW CHANGES BUTTON
	  //FIND THE EDITOR AND INJECT THE FORMAT BUTTON, THE EDITOR IFRAME IS ALWAYS RIGHT AFTER THE TEXT AREA
	  var $changesButton = editorJQuery("<input type='button' value='Review Changes' class='btnReviewChanges' style='float: left; margin: 1px 0 0 2px; padding: 0 2px;' />");
	  $changesButton.click(function()
	  {
		var sOldCode = oFormulaEditorSettings.OriginalFormulaCode;
		var sNewCode = editAreaLoader.getValue(sTextAreaId);
		
		//send a postmessage so that the contentscript can receive it and open the popup window, the contentscript has elevated permissions
		//and can create the editor scripts in the popup without being blocked by CSP rules in flow/processbuilder pages
		window.postMessage({type: "FormulaEditorReviewChanges", textAreaId: sTextAreaId, oldCode: sOldCode, newCode: sNewCode }, "*")
	  });
	  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").append($changesButton);
  }
  
  //SETUP AUTO COMPLETION
  if (typeof(fieldTreeController) != "undefined")
  {	  
	  editAreaLoader.load_syntax["forceformula"].AUTO_COMPLETION.default.KEYWORDS[""] = [];
	  var oEntriesLoaded = {}; //used as hash table to know what objects/fields have already been loaded so we don't add them multiple times
	  
	  //LOAD OBJECT FIELDS AND SYSTEM VALUES
	  for (var r = 0; r < fieldTreeController.tree.rootList.length; r++)
	  {
		  var rootNode = fieldTreeController.tree.rootList[r];		  
		  
		  var sChildrenPrefix = "";
		  
		  //r=0 IS THE OBJECT WE ARE CURRENTLY CREATING A FORMULA ON, WE DO NOT ADD AN ENTRY FOR ITS NAME SINCE WE JUST TYPE ITS FIELD NAMES DIRECTLY IN THE FORMULA WITH NO PREFIX
		  //LIKE WHEN ON AN ACCOUNT FORMULA, YOU JUST TYPE Id, NOT Account.Id
		  if (r != 0)
		  {
			//THESE ARE ENTRIES LIKE SYSTEM VARIABLES $Api, $User, etc.
			//ADD THEM UNDER THE "" PREFIX BECAUSE WE WANT IT TO BE AVAILABLE WITHOUT TYPING ANYTHING BEFORE IT
			editAreaLoader.load_syntax["forceformula"].AUTO_COMPLETION.default.KEYWORDS[""].push([rootNode.key])
			
			sChildrenPrefix = rootNode.key;
		  }
		  
		  LoadAutoCompleteNode(sChildrenPrefix, rootNode, oEntriesLoaded);
	  }
	  
	  //LOAD FUNCTION DEFINITIONS
	  if (typeof(functionNameToPrototypeMap) != "undefined")
	  {
		  for (var prop in functionNameToPrototypeMap)
		  {
			  if (functionNameToPrototypeMap.hasOwnProperty(prop))
			  {
				var insertValue = functionNameToPrototypeMap[prop].toString();
				insertValue = insertValue.replace(prop, "~"); //THE FUNCTION NAME BECOMES THE TILDE BECAUSE TILDE IS REPLACED WITH THEIR TYPED WORD
				insertValue = insertValue.replace("(", "({@}"); //ADD {@} WHERE THE CURSOR SHOULD GO AFTER INSERTED, WHICH IS AFTER THE FIRST OPEN PAREN
				editAreaLoader.load_syntax["forceformula"].AUTO_COMPLETION.default.KEYWORDS[""].push([prop, insertValue, prop + '<span class=\'datatype\' style=\'float: right; display: inline-block; padding-left: 10px;\'>Function</span>']);
			  }
			  
		  }
	  }
	  
	  //delete the currently loaded auto completion data so our dynamically loaded data will be loaded
	  delete editAreaLoader.syntax.forceformula.autocompletion;
	  
	  //console.log(oEntriesLoaded);
  }
  
  
  //send a postmessage so that the contentscript can know its ready
  window.postMessage({type: "FormulaEditorLoaded", value: "" }, "*")
}

function LoadAutoCompleteNode(sChildrenPrefix, oNode, oEntriesLoaded)
{	
	if (typeof(editAreaLoader.load_syntax["forceformula"].AUTO_COMPLETION.default.KEYWORDS[sChildrenPrefix]) == "undefined")
	{
		editAreaLoader.load_syntax["forceformula"].AUTO_COMPLETION.default.KEYWORDS[sChildrenPrefix] = [];
	}
	if (oNode.hasOwnProperty("children") == true)
	{
		for (var c = 0; c < oNode.children.length; c++)
		{
			var sType = "";
			if (typeof(oNode.children[c].attributes) != "undefined" && oNode.children[c].attributes != null && typeof(oNode.children[c].attributes.type) != "undefined")
			{
				sType = oNode.children[c].attributes.type;
			}
			
			var bEntryExists = false;
			if (sChildrenPrefix != "")
			{
				if (oEntriesLoaded.hasOwnProperty(sChildrenPrefix))
				{
					if (oEntriesLoaded[sChildrenPrefix].hasOwnProperty(oNode.children[c].key) == true)
					{
						bEntryExists = true;
					}
				}
				else
				{
					oEntriesLoaded[sChildrenPrefix] = {}
				}
			}
			
			if (bEntryExists == false)
			{
				editAreaLoader.load_syntax["forceformula"].AUTO_COMPLETION.default.KEYWORDS[sChildrenPrefix].push([oNode.children[c].key, '', oNode.children[c].key + '<span class=\'datatype\' style=\'float: right; display: inline-block; padding-left: 10px;\'>' + sType + '</span>'])
				if (sChildrenPrefix != "")
				{
					oEntriesLoaded[sChildrenPrefix][oNode.children[c].key] = true;
				}				
				
				//if its a parent and we haven't seen it yet then load it
				if (oNode.children[c].hasOwnProperty("children") && editAreaLoader.load_syntax["forceformula"].AUTO_COMPLETION.default.KEYWORDS.hasOwnProperty(oNode.children[c].key) == false)
				{
					LoadAutoCompleteNode(oNode.children[c].key, oNode.children[c], oEntriesLoaded);
				}
			}
			
		}
	}
}

function FormulaEditAreaChanged(sTextAreaId)
{
	if (typeof(window.FormulaEditorChangeTimeout) != "undefined")
	{
		clearTimeout(window.FormulaEditorChangeTimeout);
	}	
	
	var sBaseURL = editorJQuery("#ForceFormulaEditorBaseURL").val();
	
	window.FormulaEditorChangeTimeout = setTimeout(function()
	{
		editorJQuery(".formulaEditorValidation").css("background-image", "url('" + sBaseURL + "images/processing.gif')").css("display", "inline-block");;
		
		editorJQuery("#"+sTextAreaId).val(editAreaLoader.getValue(sTextAreaId)); //set the native form textarea value so when we post the form it is validating the updated formula
		
		var sEditURL = document.location.href;
		var $form = editorJQuery("#editPage").clone();
		//remove the save buttons so only the Check Syntax button is present to just do validation
		//check to see which Check Syntax button is present on the page (certain pages like account fields, validation rules, etc. use different button names)
		var sFormPostData = "";
		if ($form.find("input[type='submit'][name='validateDefaultFormula']").length > 0) //account field
		{
			$form.find("input[type='submit'][name!='validateDefaultFormula']").remove(); 
			sFormPostData = $form.serialize();
			if (sFormPostData.indexOf("validateDefaultFormula") == -1)
			{
				sFormPostData += "&validateDefaultFormula=Check Syntax";
			}
		}
		if ($form.find("input[type='submit'][name='validateFormula']").length > 0) //validation rule
		{
			$form.find("input[type='submit'][name!='validateFormula']").remove();
			sFormPostData = $form.serialize();
			if (sFormPostData.indexOf("validateFormula") == -1)
			{
				sFormPostData += "&validateFormula=Check Syntax";
			}
		}
		editorJQuery.post(sEditURL, sFormPostData, function(data)
		{
			var $eValidation = editorJQuery(data).find("#validationStatus, .validationSuccess");
			//CHANGE THE STYLE BASED ON ERROR OR NOT
			if ($eValidation.length > 0)
			{
				if ($eValidation.find(".errorStyle").length > 0) //IS ERROR
				{
					editorJQuery(".formulaEditorValidation").css("background-color", "#f8d7da").css("border", "1px solid #ff808d");
				}
				else
				{
					editorJQuery(".formulaEditorValidation").css("background-color", "#d4edda").css("border", "1px solid #80c08f");
				}
			}
			else
			{
				//workflow rule formulas show errors in this other element (successes use the above elements like normal
				var $eValidation = editorJQuery(data).find(".errorMsg");
				if ($eValidation.length > 0)
				{
					editorJQuery(".formulaEditorValidation").css("background-color", "#f8d7da").css("border", "1px solid #ff808d");
				}				
			}
			
			editorJQuery(".formulaEditorValidation").css("background-image", "none");
			
			if ($eValidation.length > 0)
			{
				editorJQuery(".formulaEditorValidation").html($eValidation.text());
			}
			else
			{
				editorJQuery(".formulaEditorValidation").hide();
			}
			
		});
		
	}, 1000);
}

function FormulaEditAreaResized(sTextAreaId)
{
	localStorage['FormulaEditorHeight'] = editorJQuery("#" + sTextAreaId).height();
	localStorage['FormulaEditorWidth'] = editorJQuery("#" + sTextAreaId).width();
}

function FormulaEditAreaFontSizeChanged(sFontSize)
{
	localStorage['FormulaEditorFontSize'] = sFontSize;
}

function FormulaEditAreaFontFamilyChanged(sFontFamily)
{
	localStorage['FormulaEditorFontFamily'] = sFontFamily;
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
			if (oFormulaEditorSettings.ObjectFields != null)
			{
				FindFieldDescribeRecursive($fieldTR, null, oFormulaEditorSettings.ObjectAPIName, i, oFieldParts, 0, oFormulaEditorSettings.ObjectFields);
			}
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
		$table.find("> tbody > tr.detailField:not('.invalidField')").each(function()
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
	
	editorJQuery("html, body").animate({ scrollTop: $table.offset().top - 75 }, 500);
	
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
		$fieldTR.addClass("invalidField").find("td.fieldType").html("Not Found <span class='formulaEditorTooltip' title='The field could not be found by the meta data api describe call or there was a parse error.'>?</span>").find(".formulaEditorTooltip").css(oEditorTooltipStyles);
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
			TextAreaEditorStartHeight: 250,
			TextAreaEditorStartWidth: 600,
			TextAreaEditorDisplay: "later",
			TextAreaEditorEditable: true,
			ObjectId: "",
			ObjectAPIName: sObjectName,
			OverrideInsertButtons: false,
			LoadFieldDetailsAfterSelector: "#frame_" + sTextAreaId,
			OriginalFormulaCode: oFieldDescribe.calculatedFormula
		}
		
		ActivateEditor(oSubFormulaEditorSettings);	
	}
	else if (oFieldDescribe.picklistValues.length > 0)
	{
		$detailsTable.append("<tr><td>Picklist Values</td><td><table class='list picklistValues'><tr class='headerRow'><th>API Name</th><th>Label</th><th>Default</th></tr></table></td></tr>");
		var $picklistTable = $detailsTable.find("table.picklistValues");
		
		for (var v = 0; v < oFieldDescribe.picklistValues.length; v++)
		{
			$picklistTable.append("<tr><td>" + oFieldDescribe.picklistValues[v].value + "</td><td>" + oFieldDescribe.picklistValues[v].label + "</td><td>" + ((oFieldDescribe.picklistValues[v].defaultValue == true) ? "Yes" : "No") + "</td></tr>");
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
	oFormulaEditorSettings.FieldsTable.find("> tbody > tr.valueField:not('.invalidField') > td.fieldPath").each(function()
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
		if (err)
		{
			alert("Error requesting record");
			console.error(err);
			return false;
		}
		if (result.records.length == 0)
		{
			alert("No record found");
			return false;
		}
		var oRecord = result.records[0];
		//console.log(oRecord);
		oFormulaEditorSettings.FieldsTable.find("> tbody > tr.valueField:not('.invalidField') > td.fieldPath").each(function()
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
	sFormula = sFormula.replace(/[\+\-\/\*\!\=\<\>\^]/ig, " ");
	
	//VALUES
	sFormula = sFormula.replace(/(\btrue\b|\bfalse\b|\bnull\b|\b[0-9]+(\.[0-9]+)?\b)/ig, " ");
	
	//FUNCTIONS
	sFormula = sFormula.replace(/(\bABS\b|\bACOS\b|\bADDMONTHS\b|\bASCII\b|\bASIN\b|\bATAN\b|\bATAN2\b|\bBEGINS\b|\bBLANKVALUE\b|\bBR\b|\bCASESAFEID\b|\bCEILING\b|\bCHR\b|\bCONTAINS\b|\bCOS\b|\bCURRENCYRATE\b|\bDATE\b|\bDATETIMEVALUE\b|\bDATEVALUE\b|\bDAY\b|\bDAYOFYEAR\b|\bDISTANCE\b|\bEXP\b|\bFIND\b|\bFLOOR\b|\bFORMATDURATON\b|\bFROMUNIXTIME\b|\bGEOLOCATION\b|\bGETSESSIONID\b|\bHOUR\b|\bHYPERLINK\b|\bIMAGE\b|\bINCLUDES\b|\bINITCAP\b|\bISBLANK\b|\bISCHANGED\b|\bISCLONE\b|\bISNEW\b|\bISNULL\b|\bISNUMBER\b|\bISOWEEK\b|\bISOYEAR\b|\bISPICKVAL\b|\bLEFT\b|\bLEN\b|\bLN\b|\bLOG\b|\bLOWER\b|\bLPAD\b|\bMAX\b|\bMCEILING\b|\bMFLOOR\b|\bMID\b|\bMILLISECOND\b|\bMIN\b|\bMINUTE\b|\bMOD\b|\bMONTH\b|\bNOT\b|\bNOW\b|\bNULLVALUE\b|\bPI\b|\bPICKLISTCOUNT\b|\bPRIORVALUE\b|\bREGEX\b|\bRIGHT\b|\bROUND\b|\bRPAD\b|\bSECOND\b|\bSIN\b|\bSQRT\b|\bSUBSTITUTE\b|\bTAN\b|\bTEXT\b|\bTIMENOW\b|\bTIMEVALUE\b|\bTODAY\b|\bTRIM\b|\bTRUNC\b|\bUNIXTIMESTAMP\b|\bUPPER\b|\bVALUE\b|\bVLOOKUP\b|\bWEEKDAY\b|\bYEAR\b)/ig, " ");
	
	//BOOLEAN
	sFormula = sFormula.replace(/(\bAND\b|\bCASE\b|\bIF\b|\bOR\b|\&|\|)/ig, " ");
	
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












//FORMATTING LOGIC
function formatFormula(sTextAreaId)
{
  var sFormula = editAreaLoader.getValue(sTextAreaId);
  
  if (sFormula.indexOf("||") != -1 || sFormula.indexOf("&&") != -1)
  {
    alert("Formatting is not available for formulas that use || and &&.");
    return;
  }
  
  try
  {
    var oTokenizer = new tokenizer(sFormula);
    
    var rootToken = buildSyntaxTree(oTokenizer);
    
    identifyTokenComplexityRecursive(rootToken);
    
    //console.log(rootToken);
    
    var sFormattedFormula = getFormattedFormulaRecursive(rootToken, 0);
    
    var iCharacterCountBefore = (sFormula.match(/[^\s\n\t]/g) || []).length;
    var iCharacterCountAfter = (sFormattedFormula.match(/[^\s\n\t]/g) || []).length;
    
    //MAKE SURE WE DIDN'T ACCIDENTILY REMOVE MEANINGFUL CHARACTERS FROM THE FORMULA AND BREAK IT
    if (iCharacterCountBefore == iCharacterCountAfter)
    {  
      editAreaLoader.setValue(sTextAreaId, sFormattedFormula);
    }
    else
    {
      alert("There was an error attempting to format the formula.");
    }
  }
  catch(err)
  {
    alert("There was an error attempting to format the formula.");
    console.log(err);
  }
}

function identifyTokenComplexityRecursive(currentToken)
{
  for (var i = 0; i < currentToken.children.length; i++)
  {    
    identifyTokenComplexityRecursive(currentToken.children[i]);
  }
  currentToken.complexChildren = hasComplexChildren(currentToken);
}

function hasComplexChildren(currentToken)
{
  var bHasComplexChildren = false;    
  
  if (
    currentToken.leftSibling != null
    &&
    currentToken.leftSibling.type == "FUNCTION"
  )
  {   
    var bComplexFunction = false;
    var iFunctionCount = 0
    var iComplexCount = 0;
    var iCommaCount = 0;
    
    if (
      currentToken.leftSibling.value == "IF" ||
      currentToken.leftSibling.value == "OR" ||
      currentToken.leftSibling.value == "AND" ||
      currentToken.leftSibling.value == "CASE"
    )
    {
      bComplexFunction = true;
    }
    
    for (var c = 0; c < currentToken.children.length; c++)
    {
      if (currentToken.children[c].type == "FUNCTION")      
      {
        iFunctionCount += 1;
      }
      if (currentToken.children[c].complexChildren == true)
      {      
        iComplexCount += 1;
      }
      if (currentToken.children[c].type == "COMMA")
      {
        iCommaCount +=1;
      }
    }
    //COMMA COUNT=DATE FUNCTION HAS 2 COMMAS, BLANKVALUE HAS 1 COMMA, ANYTHING MORE IS COMPLEX BY DEFAULT
    if (bComplexFunction == true || iFunctionCount > 1 || iComplexCount > 0 || iCommaCount > 2)
    {
      bHasComplexChildren = true;
    }
  }  
  
  return bHasComplexChildren;
}

function getFormattedFormulaRecursive(currentToken, iTabDepth)
{
  var sFormula = "";
  
  if (currentToken.type == "NAME")
  {
    sFormula += currentToken.value;
    if (currentToken.rightSibling != null && currentToken.rightSibling.type != "COMMA")
    {
      sFormula += " ";
    }
  }
  else if (currentToken.type == "FUNCTION")
  {
    if (currentToken.rightSibling != null && currentToken.rightSibling.type == "OPENPARENTHESIS" && currentToken.rightSibling.complexChildren == true && currentToken.leftSibling != null && currentToken.leftSibling.type == "OPERATOR")
    {
      sFormula += "\n" + "  ".repeat(iTabDepth-1);
    }
    sFormula += currentToken.value;
  }
  else if (currentToken.type == "NUMBER")
  {
    sFormula += currentToken.value;
    if (currentToken.rightSibling != null && currentToken.rightSibling.type != "COMMA")
    {
      sFormula += " ";
    }
  }
  else if (currentToken.type == "COMMENT")
  {
    sFormula += currentToken.value;
    if (currentToken.rightSibling == null || (currentToken.rightSibling != null && currentToken.rightSibling.type != "COMMA"))
    {
      sFormula += "\n" + "  ".repeat(iTabDepth-1);
    }
    
  }
  else if (currentToken.type == "OPERATOR")
  {
    sFormula += currentToken.value;
    if (currentToken.rightSibling != null && currentToken.rightSibling.type != "COMMA")
    {
      sFormula += " ";
    }
  }
  else if (currentToken.type == "OPENPARENTHESIS")
  {
    sFormula += currentToken.value;
    if (currentToken.leftSibling != null && currentToken.leftSibling.type == "FUNCTION" && currentToken.complexChildren == true)
    {
      sFormula += "\n" + "  ".repeat(iTabDepth);
    }
  }
  else if (currentToken.type == "CLOSEPARENTHESIS")
  {
    if (currentToken.leftSibling.leftSibling != null && currentToken.leftSibling.leftSibling.type == "FUNCTION" && currentToken.leftSibling.complexChildren == true)
    {
      sFormula += "\n" + "  ".repeat(iTabDepth-1);
    }
    sFormula += currentToken.value;
    
    //if ((currentToken.leftSibling.leftSibling != null && currentToken.leftSibling.leftSibling.type == "FUNCTION" && currentToken.leftSibling.complexChildren == true) == false)
    //{
      if (currentToken.rightSibling != null && currentToken.rightSibling.type != "COMMA")
      {
        sFormula += " ";
      }
    //}
  }
  else if (currentToken.type == "STRING")
  {
    sFormula += currentToken.value;
    if (currentToken.rightSibling != null && currentToken.rightSibling.type != "COMMA")
    {
      sFormula += " ";
    }
  }
  else if (currentToken.type == "COMMA")
  {
    sFormula += currentToken.value;
    
    if (currentToken.parent.complexChildren == true)
    {
      //DON'T ADD NEWLINE IF NEXT TOKEN IS A SINGLE LINE COMMENT OR A CASE FUNCTION KEY/VALUE ENTRY
      if (
		(currentToken.rightSibling.type == "COMMENT" && currentToken.rightSibling.value.split("\n").length < 2)	||
		(currentToken.parent.type == "OPENPARENTHESIS" && currentToken.parent.leftSibling.type == "FUNCTION" && currentToken.parent.leftSibling.value == "CASE" && !(currentToken.childCommaIndex % 2 == 0))
      )
      {
        sFormula += " "; //ADD SPACE BETWEEN THE COMMA AND COMMENT
      }
      else
      {        
		sFormula += "\n" + "  ".repeat(iTabDepth-1);
      }
    }
    else
    {
      if (currentToken.rightSibling != null && currentToken.rightSibling.type != "COMMA")
      {
        sFormula += " ";
      }
    }
  }  
  
  for (var i = 0; i < currentToken.children.length; i++)
  {    
    sFormula += getFormattedFormulaRecursive(currentToken.children[i], iTabDepth + 1);
  }  
  
  return sFormula;
}

function buildSyntaxTree(oTokenizer)
{
  var currentToken = null;
  var rootToken = oTokenizer.getNewToken();
  rootToken.value = "";
  rootToken.type = "ROOT";
  var currentParentToken = rootToken;
  var parentTokenStack = [rootToken];
  while ((currentToken = oTokenizer.getToken()) != null)
  {    
    if (currentToken.type == "OPENPARENTHESIS")
    {
      currentToken.parent = currentParentToken;
      currentParentToken.children.push(currentToken);
      parentTokenStack.push(currentToken);      
      currentParentToken = currentToken;
    }
    else if (currentToken.type == "CLOSEPARENTHESIS")
    {
      connectSiblings(currentParentToken);
      parentTokenStack.pop();
      currentParentToken = parentTokenStack[parentTokenStack.length-1]; //get token at the top of the stack
      currentParentToken.children.push(currentToken);
      currentToken.parent = currentParentToken;
    }
    else
    {
      currentToken.parent = currentParentToken;
      currentParentToken.children.push(currentToken);
    }
  }
  
  function connectSiblings(currentToken)
  {
    //connecting siblings of the parent we're closing
	var childCommaIndex = 0;
    for (var c = 1; c < currentToken.children.length; c++)
    {
      currentToken.children[c-1].rightSibling = currentToken.children[c];
      currentToken.children[c].leftSibling = currentToken.children[c-1];
	  
	  if (currentToken.children[c-1].type == "COMMA")
	  {
		currentToken.children[c-1].childCommaIndex = childCommaIndex;
		childCommaIndex += 1;
	  }
    }
  }
  
  connectSiblings(rootToken);
  
  return rootToken;
}



function tokenizer(sFormula)
{	
  var currentToken = null;	
  var lex = new lexer(sFormula);
  
  this.getToken = function()
  {
    if(lex.hasChars() == false)
    {
      return null;
    }
    
    var nextChar = lex.getChar();
        
    //SKIP NON TOKENS
    while(
      (
        nextChar.char == " " ||
        nextChar.char == "\n" ||
        nextChar.char == "\t"
      )
      && lex.hasChars()
    )
    {
      nextChar = lex.getChar();
    }
    
    if (isNumber(nextChar.code) == true)
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "NUMBER";
      
      while(lex.hasChars() && (isNumber(lex.peekChar().code) || lex.peekChar().code == 46)) //COLLECT NUMBERS AND DECIMAL
      {
        currentToken.value += lex.getChar().char;
      }
      
      return currentToken;
    }
    else if (isName(nextChar.code) == true)
    {			
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "NAME";
      
      while(lex.hasChars() && isName(lex.peekChar().code))
      {
        currentToken.value += lex.getChar().char;
      }
      if (lex.peekNonSpaceChar().char == "(")
      {
        currentToken.type = "FUNCTION";
      }

      return currentToken;
    }
    
    else if (nextChar.char == "/" && lex.hasChars() && lex.peekChar().char == "*")
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "COMMENT";
      
      var prevChar = nextChar;
      while(lex.hasChars())
      {
        nextChar = lex.getChar();
        currentToken.value += nextChar.char;        
        if (nextChar.char == "/" && prevChar.char == "*")
        {
          break;
        }
        prevChar = nextChar;
      }
      
      return currentToken;
    }
    else if (isOperator(nextChar.char) == true)
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "OPERATOR";
      
      while(lex.hasChars() && isOperator(lex.peekChar().char))
      {
        currentToken.value += lex.getChar().char;
      }
      
      return currentToken;
    }
    else if (nextChar.char == "(")
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "OPENPARENTHESIS";
      
      return currentToken;
    }
    else if (nextChar.char == ")")
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "CLOSEPARENTHESIS";
      
      return currentToken;
    }
    else if (nextChar.char == "\"")
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "STRING";
      
      while(lex.hasChars())
      {
        nextChar = lex.getChar();
        currentToken.value += nextChar.char;        
        if (nextChar.char == "\"")
        {
          break;
        }
      }
      
      return currentToken;
    }
    else if (nextChar.char == "\'")
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "STRING";
      
      while(lex.hasChars())
      {
        nextChar = lex.getChar();
        currentToken.value += nextChar.char;        
        if (nextChar.char == "\'")
        {
          break;
        }
      }
      
      return currentToken;
    }
    else if (nextChar.char == ",")
    {
      currentToken = this.getNewToken();
      currentToken.value += nextChar.char;
      currentToken.type = "COMMA";
      
      return currentToken;
    }
  };
  
  this.getNewToken = function()
  {
    return {
      value: "",
      type: "",			
      parent: null,
	  childCommaIndex: -1,
      leftSibling: null,
      rightSibling: null,
      children: [],
      complexChildren: false
    };
  }
  
  //FUNCTION NAME OR FIELD NAME
  function isName(iCharCode)
  {
    return 	(iCharCode >= 65 && iCharCode <= 90) || //UPPERCASE LETTERS
        (iCharCode >= 97 && iCharCode <= 122) || //LOWERCASE LETTERS
        iCharCode == 36 || //DOLLAR SIGN, IN THE CASE OF SYSTEM VALUES LIKE $User.IsActive
        iCharCode == 46 || //DECIMAL
        iCharCode == 95 || //UNDERSCORES
		iCharCode == 58 || //COLON, IN THE CASE OF A POLYMORPHIC OWNER FIELD LIKE Owner:User.UserRoleId
        (iCharCode >= 48 && iCharCode <= 57) //NUMBERS CAN BE IN NAMES, NAME MUST START WITH LETTER AND THEN CAN CONTAIN NUMBERS
  }

  function isNumber(iCharCode)
  {
    return 	(iCharCode >= 48 && iCharCode <= 57) //0-9
  }
  
  function isOperator(sChar)
  {
    return 	(
      sChar == "+" ||
      sChar == "-" ||
      sChar == "*" ||
      sChar == "/" ||
      sChar == "^" ||
      sChar == ">" ||
      sChar == "<" ||
      sChar == "=" ||
      sChar == "!" ||
      sChar == "^" ||
      sChar == "&" ||
      sChar == "|"
    );
  }
  
}



function lexer(sFormula)
{
  this.formula = sFormula;
  this.currentIndex = 0;
  this.hasChars = function()
  {
    return this.currentIndex <= this.formula.length;
  };
  this.peekChar = function()
  {
    if (this.currentIndex <= this.formula.length)
    {
      var sChar = this.formula.charAt(this.currentIndex)
      var iCharCode = sChar.charCodeAt(0);
      
      return { char: sChar, code: iCharCode };			
    }
    else
    {
      return null;
    }
  }
  this.peekNonSpaceChar = function()
  {
    if (this.currentIndex <= this.formula.length)
    {
      for (var iForward = 0; this.currentIndex + iForward < this.formula.length; iForward ++)
      {
        var sCharForward = this.formula.charAt(this.currentIndex + iForward);
        if (
          sCharForward != " " &&
          sCharForward != "\n" &&
          sCharForward != "\t"
        )
        {
          var sChar = sCharForward;
          var iCharCode = sCharForward.charCodeAt(0);
          
          return { char: sChar, code: iCharCode };	
        }
      }      		
    }
    else
    {
      return null;
    }
  }
  this.getChar = function()
  {
    if (this.currentIndex <= this.formula.length)
    {
      var sChar = this.formula.charAt(this.currentIndex)
      var iCharCode = sChar.charCodeAt(0);
      
      this.currentIndex += 1;
      
      return { char: sChar, code: iCharCode };			
    }
    else
    {
      return null;
    }
  }	
}
