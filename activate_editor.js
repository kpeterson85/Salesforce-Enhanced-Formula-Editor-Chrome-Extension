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
				LoadFieldDetailsAfterSelector: ".formulaFooter",
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
			window.jsforceConnection = new jsforce.Connection({
				serverUrl : "https://" + document.location.host,
				sessionId : sAccessToken,
				version: "50.0"
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
		ParentElement: document
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
			,toolbar: "search,go_to_line,fullscreen,word_wrap,|,undo,redo,|,select_fontfamily,select_fontsize"
		});
	}
}


function FormulaEditAreaLoaded(sTextAreaId)
{
	oFormulaEditorSettings = editorJQuery(editAreas[sTextAreaId].textarea).data("formulaEditorSettings");
	
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
	
	//SETUP FIELD DETAILS IF WE CAN IDENTIFY WHAT OBJECT WE ARE WORKING WITH
	if (oFormulaEditorSettings.ObjectId != "" || oFormulaEditorSettings.ObjectAPIName != "")
	{
		//ShowNewVersionMessage();
		
		var $fieldDetails = editorJQuery("<span class='formulaEditorFieldsLoadShell' style='float: left;'><input type='submit' class='btn formulaEditorFieldsLoad' value='Load Field Details' /><span class='formulaEditorTooltip' title='Loads details about the fields found in the formula.'>?</span></span><div class='formulaEditorFields' style='display: none;'><div class='fieldValuesPreviewShell' style='display: inline; text-align: right; float: right;'><input type='text' class='fieldValuesPreviewId' placeholder='Enter Record Id' /> <input type='button' class='fieldValuesPreviewButton btn' value='Load Record Values' /></div><div class='formulaEditorError' style='display: none; clear: both; background: #f8d7da; padding: 5px; border: 1px solid #ff808d; border-radius: 5px;'></div><div class='formulaEditorWarning' style='display: none; clear: both; color: #856404; background-color: #fff3cd; padding: 5px; border: 1px solid #ffe699; border-radius: 5px;'></div><table class='formulaEditorFieldsTable list'></table></div>");
					
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
		window.postMessage(editAreaLoader.getValue(sTextAreaId), "*")
	  });
	  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").prepend($saveButton);
  }  
  
  //DON'T PROVIDE THE FORMAT BUTTON FOR POPUP EDITORS (PROCESS BUILDER, FLOWS) UNTIL WE HAVE TESTED IT MORE
  if (oFormulaEditorSettings.Popup == false)
  {
	  //SETUP THE FORMAT BUTTON
	  //FIND THE EDITOR AND INJECT THE FORMAT BUTTON, THE EDITOR IFRAME IS ALWAYS RIGHT AFTER THE TEXT AREA
	  var $formatButton = editorJQuery("<input type='button' value='Format' class='btnFormaFormula' style='float: left; margin: 1px 0 0 2px; padding: 0 2px;' />");
	  $formatButton.click(function()
	  {
		formatFormula(sTextAreaId);
	  });
	  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").prepend($formatButton);
  }
  

  //SETUP THE REVIEW CHANGES BUTTON
  //FIND THE EDITOR AND INJECT THE FORMAT BUTTON, THE EDITOR IFRAME IS ALWAYS RIGHT AFTER THE TEXT AREA
  var $changesButton = editorJQuery("<input type='button' value='Review Changes' class='btnFormaFormula' style='float: left; margin: 1px 0 0 2px; padding: 0 2px;' />");
  $changesButton.click(function()
  {
	var newWin = open('','Formula Editor - Review Changes ' + sTextAreaId,'height=500,width=900'); //unique name with field id so multiple windows can be opened for different fields at one time
	
	var popupTitle = document.createElement("title");
	popupTitle.innerText = "Formula Editor - Review Changes";
	newWin.document.head.appendChild(popupTitle);
	
	newWin.document.body.setAttribute("style", "margin: 0; padding: 0;");
	
	var divOld = document.createElement("div");
	divOld.id = "old";
	divOld.setAttribute("style", "width: 50%; float: left; overflow: auto; height: 100%;");
	newWin.document.body.appendChild(divOld);
	
	var divNew = document.createElement("div");
	divNew.id = "new";
	divNew.setAttribute("style", "width: 50%; float: left; overflow: auto; height: 100%;");
	newWin.document.body.appendChild(divNew);
	
	style = document.createElement('style');
	style.type = 'text/css';
	var sCSS = `
	ins { background:#ACF2BD; text-decoration: none; }
	div.hasIns { background: #E6FFED; }
	del { background:#FDB8C0; text-decoration: none; }
	div.hasDel { background: #FFEEF0 }
	`;
	style.appendChild(document.createTextNode(sCSS));
	newWin.document.body.appendChild(style);
	
	//https://github.com/google/diff-match-patch/blob/master/LICENSE
	var diff_match_patch=function(){this.Diff_Timeout=1;this.Diff_EditCost=4;this.Match_Threshold=.5;this.Match_Distance=1E3;this.Patch_DeleteThreshold=.5;this.Patch_Margin=4;this.Match_MaxBits=32},DIFF_DELETE=-1,DIFF_INSERT=1,DIFF_EQUAL=0;diff_match_patch.Diff=function(a,b){this[0]=a;this[1]=b};diff_match_patch.Diff.prototype.length=2;diff_match_patch.Diff.prototype.toString=function(){return this[0]+","+this[1]};
	diff_match_patch.prototype.diff_main=function(a,b,c,d){"undefined"==typeof d&&(d=0>=this.Diff_Timeout?Number.MAX_VALUE:(new Date).getTime()+1E3*this.Diff_Timeout);if(null==a||null==b)throw Error("Null input. (diff_main)");if(a==b)return a?[new diff_match_patch.Diff(DIFF_EQUAL,a)]:[];"undefined"==typeof c&&(c=!0);var e=c,f=this.diff_commonPrefix(a,b);c=a.substring(0,f);a=a.substring(f);b=b.substring(f);f=this.diff_commonSuffix(a,b);var g=a.substring(a.length-f);a=a.substring(0,a.length-f);b=b.substring(0,
	b.length-f);a=this.diff_compute_(a,b,e,d);c&&a.unshift(new diff_match_patch.Diff(DIFF_EQUAL,c));g&&a.push(new diff_match_patch.Diff(DIFF_EQUAL,g));this.diff_cleanupMerge(a);return a};
	diff_match_patch.prototype.diff_compute_=function(a,b,c,d){if(!a)return[new diff_match_patch.Diff(DIFF_INSERT,b)];if(!b)return[new diff_match_patch.Diff(DIFF_DELETE,a)];var e=a.length>b.length?a:b,f=a.length>b.length?b:a,g=e.indexOf(f);return-1!=g?(c=[new diff_match_patch.Diff(DIFF_INSERT,e.substring(0,g)),new diff_match_patch.Diff(DIFF_EQUAL,f),new diff_match_patch.Diff(DIFF_INSERT,e.substring(g+f.length))],a.length>b.length&&(c[0][0]=c[2][0]=DIFF_DELETE),c):1==f.length?[new diff_match_patch.Diff(DIFF_DELETE,
	a),new diff_match_patch.Diff(DIFF_INSERT,b)]:(e=this.diff_halfMatch_(a,b))?(b=e[1],f=e[3],a=e[4],e=this.diff_main(e[0],e[2],c,d),c=this.diff_main(b,f,c,d),e.concat([new diff_match_patch.Diff(DIFF_EQUAL,a)],c)):c&&100<a.length&&100<b.length?this.diff_lineMode_(a,b,d):this.diff_bisect_(a,b,d)};
	diff_match_patch.prototype.diff_lineMode_=function(a,b,c){var d=this.diff_linesToChars_(a,b);a=d.chars1;b=d.chars2;d=d.lineArray;a=this.diff_main(a,b,!1,c);this.diff_charsToLines_(a,d);this.diff_cleanupSemantic(a);a.push(new diff_match_patch.Diff(DIFF_EQUAL,""));for(var e=d=b=0,f="",g="";b<a.length;){switch(a[b][0]){case DIFF_INSERT:e++;g+=a[b][1];break;case DIFF_DELETE:d++;f+=a[b][1];break;case DIFF_EQUAL:if(1<=d&&1<=e){a.splice(b-d-e,d+e);b=b-d-e;d=this.diff_main(f,g,!1,c);for(e=d.length-1;0<=e;e--)a.splice(b,
	0,d[e]);b+=d.length}d=e=0;g=f=""}b++}a.pop();return a};
	diff_match_patch.prototype.diff_bisect_=function(a,b,c){for(var d=a.length,e=b.length,f=Math.ceil((d+e)/2),g=2*f,h=Array(g),l=Array(g),k=0;k<g;k++)h[k]=-1,l[k]=-1;h[f+1]=0;l[f+1]=0;k=d-e;for(var m=0!=k%2,p=0,x=0,w=0,q=0,t=0;t<f&&!((new Date).getTime()>c);t++){for(var v=-t+p;v<=t-x;v+=2){var n=f+v;var r=v==-t||v!=t&&h[n-1]<h[n+1]?h[n+1]:h[n-1]+1;for(var y=r-v;r<d&&y<e&&a.charAt(r)==b.charAt(y);)r++,y++;h[n]=r;if(r>d)x+=2;else if(y>e)p+=2;else if(m&&(n=f+k-v,0<=n&&n<g&&-1!=l[n])){var u=d-l[n];if(r>=
	u)return this.diff_bisectSplit_(a,b,r,y,c)}}for(v=-t+w;v<=t-q;v+=2){n=f+v;u=v==-t||v!=t&&l[n-1]<l[n+1]?l[n+1]:l[n-1]+1;for(r=u-v;u<d&&r<e&&a.charAt(d-u-1)==b.charAt(e-r-1);)u++,r++;l[n]=u;if(u>d)q+=2;else if(r>e)w+=2;else if(!m&&(n=f+k-v,0<=n&&n<g&&-1!=h[n]&&(r=h[n],y=f+r-n,u=d-u,r>=u)))return this.diff_bisectSplit_(a,b,r,y,c)}}return[new diff_match_patch.Diff(DIFF_DELETE,a),new diff_match_patch.Diff(DIFF_INSERT,b)]};
	diff_match_patch.prototype.diff_bisectSplit_=function(a,b,c,d,e){var f=a.substring(0,c),g=b.substring(0,d);a=a.substring(c);b=b.substring(d);f=this.diff_main(f,g,!1,e);e=this.diff_main(a,b,!1,e);return f.concat(e)};
	diff_match_patch.prototype.diff_linesToChars_=function(a,b){function c(a){for(var b="",c=0,g=-1,h=d.length;g<a.length-1;){g=a.indexOf("\n",c);-1==g&&(g=a.length-1);var l=a.substring(c,g+1);(e.hasOwnProperty?e.hasOwnProperty(l):void 0!==e[l])?b+=String.fromCharCode(e[l]):(h==f&&(l=a.substring(c),g=a.length),b+=String.fromCharCode(h),e[l]=h,d[h++]=l);c=g+1}return b}var d=[],e={};d[0]="";var f=4E4,g=c(a);f=65535;var h=c(b);return{chars1:g,chars2:h,lineArray:d}};
	diff_match_patch.prototype.diff_charsToLines_=function(a,b){for(var c=0;c<a.length;c++){for(var d=a[c][1],e=[],f=0;f<d.length;f++)e[f]=b[d.charCodeAt(f)];a[c][1]=e.join("")}};diff_match_patch.prototype.diff_commonPrefix=function(a,b){if(!a||!b||a.charAt(0)!=b.charAt(0))return 0;for(var c=0,d=Math.min(a.length,b.length),e=d,f=0;c<e;)a.substring(f,e)==b.substring(f,e)?f=c=e:d=e,e=Math.floor((d-c)/2+c);return e};
	diff_match_patch.prototype.diff_commonSuffix=function(a,b){if(!a||!b||a.charAt(a.length-1)!=b.charAt(b.length-1))return 0;for(var c=0,d=Math.min(a.length,b.length),e=d,f=0;c<e;)a.substring(a.length-e,a.length-f)==b.substring(b.length-e,b.length-f)?f=c=e:d=e,e=Math.floor((d-c)/2+c);return e};
	diff_match_patch.prototype.diff_commonOverlap_=function(a,b){var c=a.length,d=b.length;if(0==c||0==d)return 0;c>d?a=a.substring(c-d):c<d&&(b=b.substring(0,c));c=Math.min(c,d);if(a==b)return c;d=0;for(var e=1;;){var f=a.substring(c-e);f=b.indexOf(f);if(-1==f)return d;e+=f;if(0==f||a.substring(c-e)==b.substring(0,e))d=e,e++}};
	diff_match_patch.prototype.diff_halfMatch_=function(a,b){function c(a,b,c){for(var d=a.substring(c,c+Math.floor(a.length/4)),e=-1,g="",h,k,l,m;-1!=(e=b.indexOf(d,e+1));){var p=f.diff_commonPrefix(a.substring(c),b.substring(e)),u=f.diff_commonSuffix(a.substring(0,c),b.substring(0,e));g.length<u+p&&(g=b.substring(e-u,e)+b.substring(e,e+p),h=a.substring(0,c-u),k=a.substring(c+p),l=b.substring(0,e-u),m=b.substring(e+p))}return 2*g.length>=a.length?[h,k,l,m,g]:null}if(0>=this.Diff_Timeout)return null;
	var d=a.length>b.length?a:b,e=a.length>b.length?b:a;if(4>d.length||2*e.length<d.length)return null;var f=this,g=c(d,e,Math.ceil(d.length/4));d=c(d,e,Math.ceil(d.length/2));if(g||d)g=d?g?g[4].length>d[4].length?g:d:d:g;else return null;if(a.length>b.length){d=g[0];e=g[1];var h=g[2];var l=g[3]}else h=g[0],l=g[1],d=g[2],e=g[3];return[d,e,h,l,g[4]]};
	diff_match_patch.prototype.diff_cleanupSemantic=function(a){for(var b=!1,c=[],d=0,e=null,f=0,g=0,h=0,l=0,k=0;f<a.length;)a[f][0]==DIFF_EQUAL?(c[d++]=f,g=l,h=k,k=l=0,e=a[f][1]):(a[f][0]==DIFF_INSERT?l+=a[f][1].length:k+=a[f][1].length,e&&e.length<=Math.max(g,h)&&e.length<=Math.max(l,k)&&(a.splice(c[d-1],0,new diff_match_patch.Diff(DIFF_DELETE,e)),a[c[d-1]+1][0]=DIFF_INSERT,d--,d--,f=0<d?c[d-1]:-1,k=l=h=g=0,e=null,b=!0)),f++;b&&this.diff_cleanupMerge(a);this.diff_cleanupSemanticLossless(a);for(f=1;f<
	a.length;){if(a[f-1][0]==DIFF_DELETE&&a[f][0]==DIFF_INSERT){b=a[f-1][1];c=a[f][1];d=this.diff_commonOverlap_(b,c);e=this.diff_commonOverlap_(c,b);if(d>=e){if(d>=b.length/2||d>=c.length/2)a.splice(f,0,new diff_match_patch.Diff(DIFF_EQUAL,c.substring(0,d))),a[f-1][1]=b.substring(0,b.length-d),a[f+1][1]=c.substring(d),f++}else if(e>=b.length/2||e>=c.length/2)a.splice(f,0,new diff_match_patch.Diff(DIFF_EQUAL,b.substring(0,e))),a[f-1][0]=DIFF_INSERT,a[f-1][1]=c.substring(0,c.length-e),a[f+1][0]=DIFF_DELETE,
	a[f+1][1]=b.substring(e),f++;f++}f++}};
	diff_match_patch.prototype.diff_cleanupSemanticLossless=function(a){function b(a,b){if(!a||!b)return 6;var c=a.charAt(a.length-1),d=b.charAt(0),e=c.match(diff_match_patch.nonAlphaNumericRegex_),f=d.match(diff_match_patch.nonAlphaNumericRegex_),g=e&&c.match(diff_match_patch.whitespaceRegex_),h=f&&d.match(diff_match_patch.whitespaceRegex_);c=g&&c.match(diff_match_patch.linebreakRegex_);d=h&&d.match(diff_match_patch.linebreakRegex_);var k=c&&a.match(diff_match_patch.blanklineEndRegex_),l=d&&b.match(diff_match_patch.blanklineStartRegex_);
	return k||l?5:c||d?4:e&&!g&&h?3:g||h?2:e||f?1:0}for(var c=1;c<a.length-1;){if(a[c-1][0]==DIFF_EQUAL&&a[c+1][0]==DIFF_EQUAL){var d=a[c-1][1],e=a[c][1],f=a[c+1][1],g=this.diff_commonSuffix(d,e);if(g){var h=e.substring(e.length-g);d=d.substring(0,d.length-g);e=h+e.substring(0,e.length-g);f=h+f}g=d;h=e;for(var l=f,k=b(d,e)+b(e,f);e.charAt(0)===f.charAt(0);){d+=e.charAt(0);e=e.substring(1)+f.charAt(0);f=f.substring(1);var m=b(d,e)+b(e,f);m>=k&&(k=m,g=d,h=e,l=f)}a[c-1][1]!=g&&(g?a[c-1][1]=g:(a.splice(c-
	1,1),c--),a[c][1]=h,l?a[c+1][1]=l:(a.splice(c+1,1),c--))}c++}};diff_match_patch.nonAlphaNumericRegex_=/[^a-zA-Z0-9]/;diff_match_patch.whitespaceRegex_=/\s/;diff_match_patch.linebreakRegex_=/[\r\n]/;diff_match_patch.blanklineEndRegex_=/\n\r?\n$/;diff_match_patch.blanklineStartRegex_=/^\r?\n\r?\n/;
	diff_match_patch.prototype.diff_cleanupEfficiency=function(a){for(var b=!1,c=[],d=0,e=null,f=0,g=!1,h=!1,l=!1,k=!1;f<a.length;)a[f][0]==DIFF_EQUAL?(a[f][1].length<this.Diff_EditCost&&(l||k)?(c[d++]=f,g=l,h=k,e=a[f][1]):(d=0,e=null),l=k=!1):(a[f][0]==DIFF_DELETE?k=!0:l=!0,e&&(g&&h&&l&&k||e.length<this.Diff_EditCost/2&&3==g+h+l+k)&&(a.splice(c[d-1],0,new diff_match_patch.Diff(DIFF_DELETE,e)),a[c[d-1]+1][0]=DIFF_INSERT,d--,e=null,g&&h?(l=k=!0,d=0):(d--,f=0<d?c[d-1]:-1,l=k=!1),b=!0)),f++;b&&this.diff_cleanupMerge(a)};
	diff_match_patch.prototype.diff_cleanupMerge=function(a){a.push(new diff_match_patch.Diff(DIFF_EQUAL,""));for(var b=0,c=0,d=0,e="",f="",g;b<a.length;)switch(a[b][0]){case DIFF_INSERT:d++;f+=a[b][1];b++;break;case DIFF_DELETE:c++;e+=a[b][1];b++;break;case DIFF_EQUAL:1<c+d?(0!==c&&0!==d&&(g=this.diff_commonPrefix(f,e),0!==g&&(0<b-c-d&&a[b-c-d-1][0]==DIFF_EQUAL?a[b-c-d-1][1]+=f.substring(0,g):(a.splice(0,0,new diff_match_patch.Diff(DIFF_EQUAL,f.substring(0,g))),b++),f=f.substring(g),e=e.substring(g)),
	g=this.diff_commonSuffix(f,e),0!==g&&(a[b][1]=f.substring(f.length-g)+a[b][1],f=f.substring(0,f.length-g),e=e.substring(0,e.length-g))),b-=c+d,a.splice(b,c+d),e.length&&(a.splice(b,0,new diff_match_patch.Diff(DIFF_DELETE,e)),b++),f.length&&(a.splice(b,0,new diff_match_patch.Diff(DIFF_INSERT,f)),b++),b++):0!==b&&a[b-1][0]==DIFF_EQUAL?(a[b-1][1]+=a[b][1],a.splice(b,1)):b++,c=d=0,f=e=""}""===a[a.length-1][1]&&a.pop();c=!1;for(b=1;b<a.length-1;)a[b-1][0]==DIFF_EQUAL&&a[b+1][0]==DIFF_EQUAL&&(a[b][1].substring(a[b][1].length-
	a[b-1][1].length)==a[b-1][1]?(a[b][1]=a[b-1][1]+a[b][1].substring(0,a[b][1].length-a[b-1][1].length),a[b+1][1]=a[b-1][1]+a[b+1][1],a.splice(b-1,1),c=!0):a[b][1].substring(0,a[b+1][1].length)==a[b+1][1]&&(a[b-1][1]+=a[b+1][1],a[b][1]=a[b][1].substring(a[b+1][1].length)+a[b+1][1],a.splice(b+1,1),c=!0)),b++;c&&this.diff_cleanupMerge(a)};
	diff_match_patch.prototype.diff_xIndex=function(a,b){var c=0,d=0,e=0,f=0,g;for(g=0;g<a.length;g++){a[g][0]!==DIFF_INSERT&&(c+=a[g][1].length);a[g][0]!==DIFF_DELETE&&(d+=a[g][1].length);if(c>b)break;e=c;f=d}return a.length!=g&&a[g][0]===DIFF_DELETE?f:f+(b-e)};
	diff_match_patch.prototype.diff_prettyHtml=function(a){for(var b=[],c=/&/g,d=/</g,e=/>/g,f=/\n/g,g=0;g<a.length;g++){var h=a[g][0],l=a[g][1].replace(c,"&amp;").replace(d,"&lt;").replace(e,"&gt;").replace(f,"&para;<br>");switch(h){case DIFF_INSERT:b[g]='<ins style="background:#e6ffe6;">'+l+"</ins>";break;case DIFF_DELETE:b[g]='<del style="background:#ffe6e6;">'+l+"</del>";break;case DIFF_EQUAL:b[g]="<span>"+l+"</span>"}}return b.join("")};
	diff_match_patch.prototype.diff_text1=function(a){for(var b=[],c=0;c<a.length;c++)a[c][0]!==DIFF_INSERT&&(b[c]=a[c][1]);return b.join("")};diff_match_patch.prototype.diff_text2=function(a){for(var b=[],c=0;c<a.length;c++)a[c][0]!==DIFF_DELETE&&(b[c]=a[c][1]);return b.join("")};
	diff_match_patch.prototype.diff_levenshtein=function(a){for(var b=0,c=0,d=0,e=0;e<a.length;e++){var f=a[e][1];switch(a[e][0]){case DIFF_INSERT:c+=f.length;break;case DIFF_DELETE:d+=f.length;break;case DIFF_EQUAL:b+=Math.max(c,d),d=c=0}}return b+=Math.max(c,d)};
	diff_match_patch.prototype.diff_toDelta=function(a){for(var b=[],c=0;c<a.length;c++)switch(a[c][0]){case DIFF_INSERT:b[c]="+"+encodeURI(a[c][1]);break;case DIFF_DELETE:b[c]="-"+a[c][1].length;break;case DIFF_EQUAL:b[c]="="+a[c][1].length}return b.join("\t").replace(/%20/g," ")};
	diff_match_patch.prototype.diff_fromDelta=function(a,b){for(var c=[],d=0,e=0,f=b.split(/\t/g),g=0;g<f.length;g++){var h=f[g].substring(1);switch(f[g].charAt(0)){case "+":try{c[d++]=new diff_match_patch.Diff(DIFF_INSERT,decodeURI(h))}catch(k){throw Error("Illegal escape in diff_fromDelta: "+h);}break;case "-":case "=":var l=parseInt(h,10);if(isNaN(l)||0>l)throw Error("Invalid number in diff_fromDelta: "+h);h=a.substring(e,e+=l);"="==f[g].charAt(0)?c[d++]=new diff_match_patch.Diff(DIFF_EQUAL,h):c[d++]=
	new diff_match_patch.Diff(DIFF_DELETE,h);break;default:if(f[g])throw Error("Invalid diff operation in diff_fromDelta: "+f[g]);}}if(e!=a.length)throw Error("Delta length ("+e+") does not equal source text length ("+a.length+").");return c};diff_match_patch.prototype.match_main=function(a,b,c){if(null==a||null==b||null==c)throw Error("Null input. (match_main)");c=Math.max(0,Math.min(c,a.length));return a==b?0:a.length?a.substring(c,c+b.length)==b?c:this.match_bitap_(a,b,c):-1};
	diff_match_patch.prototype.match_bitap_=function(a,b,c){function d(a,d){var e=a/b.length,g=Math.abs(c-d);return f.Match_Distance?e+g/f.Match_Distance:g?1:e}if(b.length>this.Match_MaxBits)throw Error("Pattern too long for this browser.");var e=this.match_alphabet_(b),f=this,g=this.Match_Threshold,h=a.indexOf(b,c);-1!=h&&(g=Math.min(d(0,h),g),h=a.lastIndexOf(b,c+b.length),-1!=h&&(g=Math.min(d(0,h),g)));var l=1<<b.length-1;h=-1;for(var k,m,p=b.length+a.length,x,w=0;w<b.length;w++){k=0;for(m=p;k<m;)d(w,
	c+m)<=g?k=m:p=m,m=Math.floor((p-k)/2+k);p=m;k=Math.max(1,c-m+1);var q=Math.min(c+m,a.length)+b.length;m=Array(q+2);for(m[q+1]=(1<<w)-1;q>=k;q--){var t=e[a.charAt(q-1)];m[q]=0===w?(m[q+1]<<1|1)&t:(m[q+1]<<1|1)&t|(x[q+1]|x[q])<<1|1|x[q+1];if(m[q]&l&&(t=d(w,q-1),t<=g))if(g=t,h=q-1,h>c)k=Math.max(1,2*c-h);else break}if(d(w+1,c)>g)break;x=m}return h};
	diff_match_patch.prototype.match_alphabet_=function(a){for(var b={},c=0;c<a.length;c++)b[a.charAt(c)]=0;for(c=0;c<a.length;c++)b[a.charAt(c)]|=1<<a.length-c-1;return b};
	diff_match_patch.prototype.patch_addContext_=function(a,b){if(0!=b.length){if(null===a.start2)throw Error("patch not initialized");for(var c=b.substring(a.start2,a.start2+a.length1),d=0;b.indexOf(c)!=b.lastIndexOf(c)&&c.length<this.Match_MaxBits-this.Patch_Margin-this.Patch_Margin;)d+=this.Patch_Margin,c=b.substring(a.start2-d,a.start2+a.length1+d);d+=this.Patch_Margin;(c=b.substring(a.start2-d,a.start2))&&a.diffs.unshift(new diff_match_patch.Diff(DIFF_EQUAL,c));(d=b.substring(a.start2+a.length1,
	a.start2+a.length1+d))&&a.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,d));a.start1-=c.length;a.start2-=c.length;a.length1+=c.length+d.length;a.length2+=c.length+d.length}};
	diff_match_patch.prototype.patch_make=function(a,b,c){if("string"==typeof a&&"string"==typeof b&&"undefined"==typeof c){var d=a;b=this.diff_main(d,b,!0);2<b.length&&(this.diff_cleanupSemantic(b),this.diff_cleanupEfficiency(b))}else if(a&&"object"==typeof a&&"undefined"==typeof b&&"undefined"==typeof c)b=a,d=this.diff_text1(b);else if("string"==typeof a&&b&&"object"==typeof b&&"undefined"==typeof c)d=a;else if("string"==typeof a&&"string"==typeof b&&c&&"object"==typeof c)d=a,b=c;else throw Error("Unknown call format to patch_make.");
	if(0===b.length)return[];c=[];a=new diff_match_patch.patch_obj;for(var e=0,f=0,g=0,h=d,l=0;l<b.length;l++){var k=b[l][0],m=b[l][1];e||k===DIFF_EQUAL||(a.start1=f,a.start2=g);switch(k){case DIFF_INSERT:a.diffs[e++]=b[l];a.length2+=m.length;d=d.substring(0,g)+m+d.substring(g);break;case DIFF_DELETE:a.length1+=m.length;a.diffs[e++]=b[l];d=d.substring(0,g)+d.substring(g+m.length);break;case DIFF_EQUAL:m.length<=2*this.Patch_Margin&&e&&b.length!=l+1?(a.diffs[e++]=b[l],a.length1+=m.length,a.length2+=m.length):
	m.length>=2*this.Patch_Margin&&e&&(this.patch_addContext_(a,h),c.push(a),a=new diff_match_patch.patch_obj,e=0,h=d,f=g)}k!==DIFF_INSERT&&(f+=m.length);k!==DIFF_DELETE&&(g+=m.length)}e&&(this.patch_addContext_(a,h),c.push(a));return c};
	diff_match_patch.prototype.patch_deepCopy=function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c],e=new diff_match_patch.patch_obj;e.diffs=[];for(var f=0;f<d.diffs.length;f++)e.diffs[f]=new diff_match_patch.Diff(d.diffs[f][0],d.diffs[f][1]);e.start1=d.start1;e.start2=d.start2;e.length1=d.length1;e.length2=d.length2;b[c]=e}return b};
	diff_match_patch.prototype.patch_apply=function(a,b){if(0==a.length)return[b,[]];a=this.patch_deepCopy(a);var c=this.patch_addPadding(a);b=c+b+c;this.patch_splitMax(a);for(var d=0,e=[],f=0;f<a.length;f++){var g=a[f].start2+d,h=this.diff_text1(a[f].diffs),l=-1;if(h.length>this.Match_MaxBits){var k=this.match_main(b,h.substring(0,this.Match_MaxBits),g);-1!=k&&(l=this.match_main(b,h.substring(h.length-this.Match_MaxBits),g+h.length-this.Match_MaxBits),-1==l||k>=l)&&(k=-1)}else k=this.match_main(b,h,
	g);if(-1==k)e[f]=!1,d-=a[f].length2-a[f].length1;else if(e[f]=!0,d=k-g,g=-1==l?b.substring(k,k+h.length):b.substring(k,l+this.Match_MaxBits),h==g)b=b.substring(0,k)+this.diff_text2(a[f].diffs)+b.substring(k+h.length);else if(g=this.diff_main(h,g,!1),h.length>this.Match_MaxBits&&this.diff_levenshtein(g)/h.length>this.Patch_DeleteThreshold)e[f]=!1;else{this.diff_cleanupSemanticLossless(g);h=0;var m;for(l=0;l<a[f].diffs.length;l++){var p=a[f].diffs[l];p[0]!==DIFF_EQUAL&&(m=this.diff_xIndex(g,h));p[0]===
	DIFF_INSERT?b=b.substring(0,k+m)+p[1]+b.substring(k+m):p[0]===DIFF_DELETE&&(b=b.substring(0,k+m)+b.substring(k+this.diff_xIndex(g,h+p[1].length)));p[0]!==DIFF_DELETE&&(h+=p[1].length)}}}b=b.substring(c.length,b.length-c.length);return[b,e]};
	diff_match_patch.prototype.patch_addPadding=function(a){for(var b=this.Patch_Margin,c="",d=1;d<=b;d++)c+=String.fromCharCode(d);for(d=0;d<a.length;d++)a[d].start1+=b,a[d].start2+=b;d=a[0];var e=d.diffs;if(0==e.length||e[0][0]!=DIFF_EQUAL)e.unshift(new diff_match_patch.Diff(DIFF_EQUAL,c)),d.start1-=b,d.start2-=b,d.length1+=b,d.length2+=b;else if(b>e[0][1].length){var f=b-e[0][1].length;e[0][1]=c.substring(e[0][1].length)+e[0][1];d.start1-=f;d.start2-=f;d.length1+=f;d.length2+=f}d=a[a.length-1];e=d.diffs;
	0==e.length||e[e.length-1][0]!=DIFF_EQUAL?(e.push(new diff_match_patch.Diff(DIFF_EQUAL,c)),d.length1+=b,d.length2+=b):b>e[e.length-1][1].length&&(f=b-e[e.length-1][1].length,e[e.length-1][1]+=c.substring(0,f),d.length1+=f,d.length2+=f);return c};
	diff_match_patch.prototype.patch_splitMax=function(a){for(var b=this.Match_MaxBits,c=0;c<a.length;c++)if(!(a[c].length1<=b)){var d=a[c];a.splice(c--,1);for(var e=d.start1,f=d.start2,g="";0!==d.diffs.length;){var h=new diff_match_patch.patch_obj,l=!0;h.start1=e-g.length;h.start2=f-g.length;""!==g&&(h.length1=h.length2=g.length,h.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,g)));for(;0!==d.diffs.length&&h.length1<b-this.Patch_Margin;){g=d.diffs[0][0];var k=d.diffs[0][1];g===DIFF_INSERT?(h.length2+=
	k.length,f+=k.length,h.diffs.push(d.diffs.shift()),l=!1):g===DIFF_DELETE&&1==h.diffs.length&&h.diffs[0][0]==DIFF_EQUAL&&k.length>2*b?(h.length1+=k.length,e+=k.length,l=!1,h.diffs.push(new diff_match_patch.Diff(g,k)),d.diffs.shift()):(k=k.substring(0,b-h.length1-this.Patch_Margin),h.length1+=k.length,e+=k.length,g===DIFF_EQUAL?(h.length2+=k.length,f+=k.length):l=!1,h.diffs.push(new diff_match_patch.Diff(g,k)),k==d.diffs[0][1]?d.diffs.shift():d.diffs[0][1]=d.diffs[0][1].substring(k.length))}g=this.diff_text2(h.diffs);
	g=g.substring(g.length-this.Patch_Margin);k=this.diff_text1(d.diffs).substring(0,this.Patch_Margin);""!==k&&(h.length1+=k.length,h.length2+=k.length,0!==h.diffs.length&&h.diffs[h.diffs.length-1][0]===DIFF_EQUAL?h.diffs[h.diffs.length-1][1]+=k:h.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,k)));l||a.splice(++c,0,h)}}};diff_match_patch.prototype.patch_toText=function(a){for(var b=[],c=0;c<a.length;c++)b[c]=a[c];return b.join("")};
	diff_match_patch.prototype.patch_fromText=function(a){var b=[];if(!a)return b;a=a.split("\n");for(var c=0,d=/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;c<a.length;){var e=a[c].match(d);if(!e)throw Error("Invalid patch string: "+a[c]);var f=new diff_match_patch.patch_obj;b.push(f);f.start1=parseInt(e[1],10);""===e[2]?(f.start1--,f.length1=1):"0"==e[2]?f.length1=0:(f.start1--,f.length1=parseInt(e[2],10));f.start2=parseInt(e[3],10);""===e[4]?(f.start2--,f.length2=1):"0"==e[4]?f.length2=0:(f.start2--,f.length2=
	parseInt(e[4],10));for(c++;c<a.length;){e=a[c].charAt(0);try{var g=decodeURI(a[c].substring(1))}catch(h){throw Error("Illegal escape in patch_fromText: "+g);}if("-"==e)f.diffs.push(new diff_match_patch.Diff(DIFF_DELETE,g));else if("+"==e)f.diffs.push(new diff_match_patch.Diff(DIFF_INSERT,g));else if(" "==e)f.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,g));else if("@"==e)break;else if(""!==e)throw Error('Invalid patch mode "'+e+'" in: '+g);c++}}return b};
	diff_match_patch.patch_obj=function(){this.diffs=[];this.start2=this.start1=null;this.length2=this.length1=0};
	diff_match_patch.patch_obj.prototype.toString=function(){for(var a=["@@ -"+(0===this.length1?this.start1+",0":1==this.length1?this.start1+1:this.start1+1+","+this.length1)+" +"+(0===this.length2?this.start2+",0":1==this.length2?this.start2+1:this.start2+1+","+this.length2)+" @@\n"],b,c=0;c<this.diffs.length;c++){switch(this.diffs[c][0]){case DIFF_INSERT:b="+";break;case DIFF_DELETE:b="-";break;case DIFF_EQUAL:b=" "}a[c+1]=b+encodeURI(this.diffs[c][1])+"\n"}return a.join("").replace(/%20/g," ")};
	this.diff_match_patch=diff_match_patch;this.DIFF_DELETE=DIFF_DELETE;this.DIFF_INSERT=DIFF_INSERT;this.DIFF_EQUAL=DIFF_EQUAL;

	function GetHTML(diffs, ops)
	{
	  var html = [];
	  var pattern_amp = /&/g;
	  var pattern_lt = /</g;
	  var pattern_gt = />/g;
	  var pattern_space = /\s/g;
	  var pattern_para = /\n/g;
	  for (var x = 0; x < diffs.length; x++)
	  {
		var op = diffs[x][0];    // Operation (insert, delete, equal)
		var data = diffs[x][1];  // Text of change.
		var text = data.replace(pattern_amp, '&amp;');
		text = text.replace(pattern_lt, '&lt;');
		text = text.replace(pattern_gt, '&gt;');
		
			
		if (ops.includes(op))
		{
			switch (op)
			{
			  case DIFF_INSERT:
				text = text.replace(pattern_para, '</ins></div><div><ins>');
				text = text.replace(pattern_space, '&nbsp;');
				html[x] = '<ins>' + text + '</ins>';
				break;
			  case DIFF_DELETE:
				text = text.replace(pattern_para, '</del></div><div><del>');
				text = text.replace(pattern_space, '&nbsp;');
				html[x] = '<del>' + text + '</del>';
				break;
			  case DIFF_EQUAL:
				text = text.replace(pattern_para, '</span></div><div><span>');
				text = text.replace(pattern_space, '&nbsp;');
				html[x] = '<span>' + text + '</span>';
				break;
			}
		}
	  }
	  return '<div>' + html.join('') + '</div>';
	}
	
	var sNewCode = editAreaLoader.getValue(sTextAreaId);
	var sOldCode = oFormulaEditorSettings.OriginalFormulaCode;
	
	var dmp = new diff_match_patch();
	var diff = dmp.diff_main(sOldCode, sNewCode);
	dmp.diff_cleanupSemantic(diff);
	
	var sOldCodeDiffHTML = GetHTML(diff, [DIFF_DELETE, DIFF_EQUAL]);
	newWin.document.getElementById("old").innerHTML = sOldCodeDiffHTML;

	var sNewCodeDiffHTML = GetHTML(diff, [DIFF_INSERT, DIFF_EQUAL]);
	newWin.document.getElementById("new").innerHTML = sNewCodeDiffHTML;
	var delElements = newWin.document.querySelectorAll("del");
	for (var e = 0; e < delElements.length; e++)
	{
		delElements[e].parentNode.classList.add("hasDel");
	}
	var insElements = newWin.document.querySelectorAll("ins");
	for (var e = 0; e < insElements.length; e++)
	{
		insElements[e].parentNode.classList.add("hasIns");
	}
  });
  editorJQuery("#" + sTextAreaId).next("iframe").contents().find("#toolbar_1").prepend($changesButton);

  
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
			LoadFieldDetailsAfterSelector: "#" + sTextAreaId+"Footer"
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
	sFormula = sFormula.replace(/(\bABS\b|\bADDMONTHS\b|\bBEGINS\b|\bBLANKVALUE\b|\bBR\b|\bCASESAFEID\b|\bCEILING\b|\bCONTAINS\b|\bCURRENCYRATE\b|\bDATE\b|\bDATETIMEVALUE\b|\bDATEVALUE\b|\bDAY\b|\bDISTANCE\b|\bEXP\b|\bFIND\b|\bFLOOR\b|\bGEOLOCATION\b|\bGETSESSIONID\b|\bHOUR\b|\bHYPERLINK\b|\bIMAGE\b|\bINCLUDES\b|\bISBLANK\b|\bISCHANGED\b|\bISCLONE\b|\bISNEW\b|\bISNULL\b|\bISNUMBER\b|\bISPICKVAL\b|\bLEFT\b|\bLEN\b|\bLN\b|\bLOG\b|\bLOWER\b|\bLPAD\b|\bMAX\b|\bMCEILING\b|\bMFLOOR\b|\bMID\b|\bMILLISECOND\b|\bMIN\b|\bMINUTE\b|\bMOD\b|\bMONTH\b|\bNOT\b|\bNOW\b|\bNULLVALUE\b|\bPRIORVALUE\b|\bREGEX\b|\bRIGHT\b|\bROUND\b|\bRPAD\b|\bSQRT\b|\bSECOND\b|\bSUBSTITUTE\b|\bTEXT\b|\bTIMENOW\b|\bTIMEVALUE\b|\bTODAY\b|\bTRIM\b|\bUPPER\b|\bVALUE\b|\bVLOOKUP\b|\bWEEKDAY\b|\bYEAR\b)/ig, " ");
	
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
