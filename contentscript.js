init();

function init() {
	
	var sId = "";
	
	if (document.getElementById("CalculatedFormula") != null) //FORMULA FIELD, WORKFLOW FIELD UPDATE FORMULA (DOES NOT WORK)
	{
		sId = "CalculatedFormula";
	}
	else if (document.getElementById("formulaTextArea") != null) //WORKFLOW RULE FORMULA
	{
		sId = "formulaTextArea";
	}
	else if (document.getElementById("ValidationFormula") != null) //VALIDATION RULE
	{
		sId = "ValidationFormula";
	}
	
	//some pages like 'add formula field' pages have hidden inputs
	//with the same id's as above so we must specify that it's a text area to know it's an editable field
	if (sId != "" && document.getElementById(sId).tagName == "TEXTAREA")
	{
		LoadEditorFiles(window, document, document.getElementById(sId));
	}
	else if (document.location.pathname.indexOf("flowBuilder.app") != -1 || document.location.pathname.indexOf("processui.app") != -1)
	{
		//some pages load formula fields dynamically so we have to lazy load the editor as the fields become available
		var observer = new MutationObserver(function(mutations)
		{
			mutations.forEach(function(mutation)
			{
				if (!mutation.addedNodes) return; //only care about newly added elements

				//textarea[name='Formula'] = flow formula resource
				//textarea[name='formulaExpression'] = flow screen field validation rule
				//div.processuicommonFormulaBuilder textarea = proccess builder action group criteria, process builder update record formula
				var elements = document.querySelectorAll("textarea[name='Formula'], textarea[name='formulaExpression'], div.processuicommonFormulaBuilder textarea");

				if (elements.length > 0)
				{
					for (var e = 0; e < elements.length; e++)
					{
						if (elements[e].classList.contains("enhanced") == false)  //we add this class ourselves so if it exists it means we've already seen this field
						{
							//console.log("Found lazy load formula field");
					
							elements[e].classList.add("enhanced");
							
							var btnOpen = document.createElement("input");
							btnOpen.type = "button";
							btnOpen.value = "Open Enhanced Formula Editor";
							btnOpen.setAttribute("class", "btnOpenEnhancedFormulaEditor");
							btnOpen.setAttribute("style", "margin-left: 10px;");
							
							var componentRoot = elements[e].closest(".property-input"); //FLOW formulas
							if (componentRoot == null)
							{
								componentRoot = elements[e].closest(".formulaBuilder"); //Proccess builder action group criteria formulas
							}
							if (componentRoot == null)
							{
								componentRoot = elements[e].closest(".inlineFormulaBuilder"); //Proccess builder update record field formulas
							}
							
							//MAKE SURE WE FOUND THE PARENT SHELL ELEMENT AND THAT IT DOESN'T ALREADY HAVE AN OPEN Button
							//-FOR PROCESS BUILDERS WHEN CLICKING THE 'ADD CRITERIA' DIAMOND BUTTON IT WAS RESETTING THE STYLES ON THE FORMULA TEXT FIELD REMOVING THE 'enhanced' CLASS ON THE FIELD BUT KEEPING THE CUSTOM BUTTON THAT HAD BEEN ADDED
							//SO DON'T ADD ANOTHER ONE IF THE BUTTON ALREADY EXISTS
							if (componentRoot != null && componentRoot.querySelector("label").querySelector(".btnOpenEnhancedFormulaEditor") == null)
							{
								componentRoot.querySelector("label").appendChild(btnOpen);
								
								btnOpen.editorField = elements[e];

								btnOpen.addEventListener("click", function()
								{
									var btn = this;
									
									//if a popup isn't already created for the button then create one
									if (typeof(btn.popup) == "undefined" || btn.popup == null)
									{
										var newWin = open('','Formula Editor - ' + btn.editorField.id,'height=500,width=700'); //unique name with field id so multiple windows can be opened for different fields at one time
										btn.popup = newWin;
										
										var popupTitle = document.createElement("title");
										popupTitle.innerText = "Formula Editor Popup";
										newWin.document.head.appendChild(popupTitle);
										
										//create a formula text area in the popup for ourselves and use the id "Calculated Formula" which is one of the standard formula field ids we enhance
										var popupTextarea = document.createElement("textarea");
										popupTextarea.id = "CalculatedFormula";
										popupTextarea.value = btn.editorField.value;
										popupTextarea.setAttribute("data-editor-popup", "true"); //add this attribute so the activate_editor code knows it is in a popup context
										popupTextarea.setAttribute("style", "width: 100%; height: 100%;");
										newWin.document.body.appendChild(popupTextarea);
										
										newWin.editorField = btn.editorField;
										newWin.btn = btn;
										
										//in the formula popup we could not reference window.opener for security reasons so we went with window postmessages
										newWin.addEventListener("message", function(event)
										{
										  if (event.data.hasOwnProperty("type") && event.data.type == "FormulaEditorPopupSave")
										  {
											  //receive the postmessage from the popup window (sent from activate_editor) which contains the updated formula
											  newWin.editorField.value = event.data.value;
											  
											  //TRIGGER THE NATIVE CHANGE EVENT ON THE FIELD SO OTHER SALESFORCE FEATURES PICK UP ON THE CHANGE AND THE NEW CONTENT GETS SAVED
											  newWin.editorField.dispatchEvent(new Event('change'));
											  
											  newWin.close();
										  }										  
										});
										
										newWin.addEventListener("beforeunload", function(e)
										{
										   this.btn.popup = null;
										}, false);

										LoadEditorFiles(newWin, newWin.document, popupTextarea);
									}
									else
									{
										btn.popup.focus();
									}
									
								});					
							}
						}
					}
										
				}
			});
		});
		
		var observerConfig = {
			childList: true
			, subtree: true
			, attributes: false
			, characterData: false
		}

		observer.observe(document.body, observerConfig);		
		
	}
	
	function LoadEditorFiles(elWindow, elDocument, elTextField)
	{
		//GET THE STORAGE SYNC VALUE HERE IN THE CONTENT SCRIPT BECAUSE WE CAN'T USE THE STORAGE API FROM
		//WITHIN THE PAGE ITSELF					
		chrome.storage.sync.get(['FormulaEditorLicense'], function(result)
		{
			//console.log('Value currently is ' + result.FormulaEditorLicense);
			
			//ADD THE VALUE TO THE TRUE PAGE IN A HIDDEN FIELD SO WE CAN ACCESS IT,
			//CONTENT SCRIPT CAN'T SET/ACCESS WINDOW VARIABLES
			var hdnLicense = elDocument.createElement("input");
			hdnLicense.type = "hidden";
			hdnLicense.id = "hdnFormulaEditorLicense";
			if (typeof(result.FormulaEditorLicense) != "undefined")
			{
				hdnLicense.value = result.FormulaEditorLicense;
			}
			elDocument.getElementsByTagName("body")[0].appendChild(hdnLicense);
			
			var sOptionsUrl = chrome.extension.getURL("options.html");
			var hdnOptionsURL = elDocument.createElement("input");
			hdnOptionsURL.type = "hidden";
			hdnOptionsURL.id = "hdnFormulaEditorOptionsURL";
			hdnOptionsURL.value = sOptionsUrl;
			elDocument.getElementsByTagName("body")[0].appendChild(hdnOptionsURL);						
			
			var eStatusMessage = elDocument.createElement("div");
			eStatusMessage.setAttribute("class", "formulaEditorStatus");
			eStatusMessage.setAttribute("style", "display: none; font-family: Arial; font-size: 12px; color: #856404; background-color: #fff3cd; border: 1px solid #ffe699; padding: 10px 15px; margin: 5px 5px 5px 0; line-height: 1.5;");
			elTextField.before(eStatusMessage);
			
			var sOptionsURL = "";
			if (typeof(elDocument.getElementById("hdnFormulaEditorOptionsURL")) != "undefined" && elDocument.getElementById("hdnFormulaEditorOptionsURL") != null)
			{
				sOptionsURL = elDocument.getElementById("hdnFormulaEditorOptionsURL").value;
			}
			
			var sFormulaEditorLicense = null;
			if (typeof(elDocument.getElementById("hdnFormulaEditorLicense")) != "undefined" && elDocument.getElementById("hdnFormulaEditorLicense") != null)
			{
				sFormulaEditorLicense = elDocument.getElementById("hdnFormulaEditorLicense").value;
			}
			
			var sGetLicenseKeyButton = "<a href='https://www.enhancedformulaeditor.com/install.php' target='_blank' class='btn' style='color: #000; font-weight: normal; margin: 10px 5px 0px 0; display: inline-block; text-decoration: none; border: 1px solid #b5b5b5; background: #f3f2f2; border-radius: 3px; padding: 3px 4px;'>Get a License Key</a>";
			var sOptionsButton = "<a href='" + sOptionsURL + "' target='_blank' class='btn' style='color: #000; font-weight: normal; margin: 10px 5px 0px 0; display: inline-block; text-decoration: none; border: 1px solid #b5b5b5; background: #f3f2f2; border-radius: 3px; padding: 3px 4px;'>Extension Options</a>";
			var sManageSubscriptionButton = "<a href='https://www.enhancedformulaeditor.com/subscription.php' target='_blank' class='btn' style='color: #000; font-weight: normal; margin: 10px 5px 0px 0; display: inline-block; text-decoration: none; border: 1px solid #b5b5b5; background: #f3f2f2; border-radius: 3px; padding: 3px 4px;'>Manage Subscription</a>";
			
			//IF A LICENSE KEY VALUE WAS FOUND
			if (sFormulaEditorLicense != null && sFormulaEditorLicense.trim() != "")
			{
				fetch("https://www.enhancedformulaeditor.com/subscription-check.php",
				{
					method: "POST",
					headers: {
						Accept: "text/plain", //use text/plain instead of application/json to avoid preflight CORS request https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
						"Content-Type": "text/plain",
					},
					body: JSON.stringify({
						key: sFormulaEditorLicense
					}),
				})
				.then((response) => response.json())
				.then(function (data)
				{
					if (
						data.success
					)
					{
						//GET ANY STORED ACCESS TOKENS FOR THIS ORG AND USER
						chrome.storage.sync.get(['FormulaEditorAccessTokens'], function(result)
						{							
							result.FormulaEditorAccessTokens = result.FormulaEditorAccessTokens || {};
							
							//get latest org id for the salesforce domain (na62 for example or a company.my.salesforce.com)
							var sOrgId = readCookie("oid");
							
							//IF WE HAVE ACCESS TOKEN INFO ON FILE THEN CHECK IT, OTHERWISE LOAD THE FILES WITHOUT IT
							var oAccessInfo = null;
							var sAccessToken = "";
							
							if (sOrgId != null && sOrgId != "")
							{
								sOrgId = convert15Idto18(sOrgId);
								for (var key in result.FormulaEditorAccessTokens)
								{
									//key is in the format sUserId+'_'+sOrgId but we aren't given the user id in any cookies so we just look it up based on org id
									if (result.FormulaEditorAccessTokens.hasOwnProperty(key) && key.endsWith(sOrgId))
									{
										oAccessInfo = result.FormulaEditorAccessTokens[key];
										break;
									}
								}
							}
							if (oAccessInfo != null)
							{
								chrome.runtime.sendMessage({type: "FormulaEditorAccessTokenCheck", data: oAccessInfo}, function(response)
								{
									oAccessInfo = response;
									sAccessToken = oAccessInfo.access_token;
									FinishLoadingFiles();
								});
							}
							else
							{
								FinishLoadingFiles();
							}

							function FinishLoadingFiles()
							{
								//ADD THE VALUE TO THE PAGE IN A HIDDEN FIELD SO WE CAN ACCESS IT,
								//CONTENT SCRIPT CAN'T SET/ACCESS WINDOW VARIABLES
								var hdnAccessToken = elDocument.createElement("input");
								hdnAccessToken.type = "hidden";
								hdnAccessToken.id = "hdnFormulaEditorAccessToken";
								hdnAccessToken.value = sAccessToken;
								elDocument.getElementsByTagName("body")[0].appendChild(hdnAccessToken);
								
								var hiddenBaseURL = elDocument.createElement("input")
								hiddenBaseURL.id = "ForceFormulaEditorBaseURL";
								hiddenBaseURL.type = "hidden";
								hiddenBaseURL.value = chrome.extension.getURL("");
								if (elDocument.getElementsByTagName("body").length == 0)
								{
									elDocument.getElementsByTagName("html")[0].appendChild(elDocument.createElement("body"))
								}
								elDocument.getElementsByTagName("body")[0].appendChild(hiddenBaseURL);				
								
								var loader = elDocument.createElement("script");
								loader.type = "text/javascript";
								loader.src = chrome.extension.getURL("edit_area_loader.js");
								loader.charset = "UTF-8";
								loader.onload = loaderLoaded;
								loader.id = "editorLoaderScript";
								elDocument.getElementsByTagName("head")[0].appendChild(loader);		

								function loaderLoaded()
								{								
									var jqueryScript = elDocument.createElement("script");
									jqueryScript.type = "text/javascript";
									jqueryScript.src = chrome.extension.getURL("jquery.min.js");
									jqueryScript.charset = "UTF-8";
									elDocument.getElementsByTagName("head")[0].appendChild(jqueryScript);
									
									var jsforceScript = elDocument.createElement("script");
									jsforceScript.type = "text/javascript";
									jsforceScript.src = chrome.extension.getURL("jsforce-core.min.js");
									jsforceScript.charset = "UTF-8";
									jsforceScript.onload = jsforceScriptLoaded;
									elDocument.getElementsByTagName("head")[0].appendChild(jsforceScript);
									
									function jsforceScriptLoaded()
									{								
										var activate = elDocument.createElement("script");
										activate.type = "text/javascript";
										activate.src = chrome.extension.getURL("activate_editor.js");
										activate.charset = "UTF-8";
										elDocument.getElementsByTagName("head")[0].appendChild(activate);
										
										//LISTEN FOR THE 'REVIEW CHANGES' BUTTON CLICK MESSAGE AND SHOW A POPUP WINDOW WITH 2 EDITORS HIGHLIGHTING THE
										//DELETES AND ADDITIONS TO THE CODE, THIS IS HANDLED HERE IN THE CONTENT SCRIPT
										//BECAUSE IN FLOWS/PROCESS BUILDERS A LOT OF THE BELOW WORK CAN'T BE DONE WITHOUT CAUSING CSP ERRORS
										elWindow.addEventListener("message", function(event)
										{
										    if (event.data.hasOwnProperty("type") && event.data.type == "FormulaEditorReviewChanges")
											{
												
												var sOldCode = event.data.oldCode;
												var sNewCode = event.data.newCode;
												var sTextAreaId = event.data.sTextAreaId;
												
												if (sOldCode == sNewCode)
												{
													elWindow.alert("No changes found.");
													return false;
												}
												
												var newWin = open('','Formula Editor - Review Changes ' + sTextAreaId,'height=500,width=900'); //unique name with field id so multiple windows can be opened for different fields at one time
												
												var popupTitle = document.createElement("title");
												popupTitle.innerText = "Formula Editor - Review Changes";
												newWin.document.head.appendChild(popupTitle);
												
												newWin.document.body.setAttribute("style", "margin: 0; padding: 0;");
												
												var txtOld = document.createElement("textarea");
												txtOld.id = "old";
												txtOld.setAttribute("style", "width: 50%; float: left; overflow: auto; height: 100%;");
												newWin.document.body.appendChild(txtOld);
												
												var txtNew = document.createElement("textarea");
												txtNew.id = "new";
												txtNew.setAttribute("style", "width: 50%; float: left; overflow: auto; height: 100%;");
												newWin.document.body.appendChild(txtNew);
													
												txtOld.value = sOldCode;
												txtNew.value = sNewCode;
												
												//BUILD STRING LITERALS OF CSS/JS THAT WE WILL INJECT INTO THE POPUP WINDOW
												var sCSS = `
												ins { background:#ACF2BD; text-decoration: none; }
												div.hasIns { background: #E6FFED; }
												del { background:#FDB8C0; text-decoration: none; }
												div.hasDel { background: #FFEEF0 }
												`;
												var style = document.createElement('style');
												style.type = 'text/css';	
												style.appendChild(document.createTextNode(sCSS));
												newWin.document.body.appendChild(style);
												
												//THIS IS NEEDED FOR THE EDITAREA EDITOR
												var hiddenBaseURL = document.createElement("input")
												hiddenBaseURL.id = "ForceFormulaEditorBaseURL";
												hiddenBaseURL.type = "hidden";
												hiddenBaseURL.value = elDocument.getElementById("ForceFormulaEditorBaseURL").value; //get the value from the existing hidden that the contentscript added to the current page, we will create a duplicate in the popup
												newWin.document.body.appendChild(hiddenBaseURL);
												
												var sJS = `
												function loaderLoaded()
												{		
													editAreaLoader.init({
														id: "old"	// id of the textarea to transform		
														,start_highlight: true	// if start with highlight
														,allow_resize: "both"
														,allow_toggle: true
														,word_wrap: false
														,language: "en"
														,syntax: "forceformula"
														,replace_tab_by_spaces: 2
														//,font_size: sFontSize
														//,font_family: sFontFamily
														//,min_height: oFormulaEditorSettings.TextAreaEditorMinHeight
														//,min_width: oFormulaEditorSettings.TextAreaEditorMinWidth		
														,show_line_colors: true
														//,EA_load_callback: "FormulaEditAreaLoaded"
														//,EA_resized_callback: oFormulaEditorSettings.TextAreaEditorResizedCallback
														,EA_font_size_changed_callback: ""
														,EA_font_family_changed_callback: ""
														//,display: oFormulaEditorSettings.TextAreaEditorDisplay
														,is_editable: false
														//,parent: oFormulaEditorSettings.ParentElement
														//,fullscreen: oFormulaEditorSettings.Popup
														//,plugins: "autocompletion"
														//,autocompletion: true
														//,toolbar: "search,go_to_line,fullscreen,word_wrap,|,undo,redo,|,select_fontfamily,select_fontsize"
														,allow_toggle: false //don't show the toggle checkbox in this view since it takes up space and messes up the editors showing side by side
													});
													
													editAreaLoader.init({
														id: "new"	// id of the textarea to transform		
														,start_highlight: true	// if start with highlight
														,allow_resize: "both"
														,allow_toggle: true
														,word_wrap: false
														,language: "en"
														,syntax: "forceformula"
														,replace_tab_by_spaces: 2
														//,font_size: sFontSize
														//,font_family: sFontFamily
														//,min_height: oFormulaEditorSettings.TextAreaEditorMinHeight
														//,min_width: oFormulaEditorSettings.TextAreaEditorMinWidth		
														,show_line_colors: true
														,EA_load_callback: "DiffEditAreasLoaded"
														//,EA_resized_callback: oFormulaEditorSettings.TextAreaEditorResizedCallback
														,EA_font_size_changed_callback: ""
														,EA_font_family_changed_callback: ""
														//,display: oFormulaEditorSettings.TextAreaEditorDisplay
														,is_editable: false
														//,parent: oFormulaEditorSettings.ParentElement
														//,fullscreen: oFormulaEditorSettings.Popup
														//,plugins: "autocompletion"
														//,autocompletion: true
														//,toolbar: "search,go_to_line,fullscreen,word_wrap,|,undo,redo,|,select_fontfamily,select_fontsize"
														,allow_toggle: false //don't show the toggle checkbox in this view since it takes up space and messes up the editors showing side by side
													});
													
													window.DiffEditAreasLoaded = function()
													{		
														//send a postmessage so that the contentscript can receive it and load the diff content, the contentscript has elevated permissions
														//and can do more in the popup without being blocked by CSP rules in flow/processbuilder pages
														window.postMessage({type: "FormulaEditorReviewChangesLoadDiffs" }, "*")
														
														
													}
												}
												`;
												var script = document.createElement('script');
												script.type = 'text/javascript';	
												script.appendChild(document.createTextNode(sJS));
												newWin.document.body.appendChild(script);
												
												var sLoaderPath = elDocument.getElementById("editorLoaderScript").getAttribute("src"); //get the value from the existing script that the contentscript added to the current page, we will create a duplicate in the popup
												var sJS = `
												var loader = document.createElement("script");
												loader.type = "text/javascript";
												loader.src = "${sLoaderPath}";
												loader.charset = "UTF-8";
												loader.onload = loaderLoaded;
												document.body.appendChild(loader);	
												
												//cause window load to fire so the editarea loader script knows the window is ready since we are adding it to a popup where window loaded already fire
												setTimeout(function(){
													dispatchEvent(new Event('load'));
												}, 100);
												`;
												var script = document.createElement('script');
												script.type = 'text/javascript';
												script.appendChild(document.createTextNode(sJS));
												newWin.document.body.appendChild(script);
												
												//LISTEN FOR THE 'REVIEW CHANGES' EDITORS TO BE FINISHED LOADED, THIS IS FIRED FROM THE 'loaderLoaded' FUNCTION
												newWin.addEventListener("message", function(event)
												{
													if (event.data.hasOwnProperty("type") && event.data.type == "FormulaEditorReviewChangesLoadDiffs")
													{
												
														//GOOGLE DIFF MATCH LIBRARY
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
														
														//CONVERT THE GOOGLE DIFF MATCH RESULTS TO HTML WITH DIVS FOR EACH LINE SO WE CAN HIGHLIGHT LINES THAT HAVE CHANGES
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
														
														var dmp = new diff_match_patch();
														var diff = dmp.diff_main(sOldCode, sNewCode);
														dmp.diff_cleanupSemantic(diff);
														
														var sOldCodeDiffHTML = GetHTML(diff, [DIFF_DELETE, DIFF_EQUAL]);
														newWin.document.getElementById("old").nextSibling.contentWindow.document.getElementById("content_changes").innerHTML = sOldCodeDiffHTML;
														//hide the background color that shows for the current line they've clicked on since it makes it confusing next to the green/red background colors
														newWin.document.getElementById("old").nextSibling.contentWindow.document.getElementById("selection_field").style.display = "none";
														
														var sNewCodeDiffHTML = GetHTML(diff, [DIFF_INSERT, DIFF_EQUAL]);
														newWin.document.getElementById("new").nextSibling.contentWindow.document.getElementById("content_changes").innerHTML = sNewCodeDiffHTML;
														//hide the background color that shows for the current line they've clicked on since it makes it confusing next to the green/red background colors
														newWin.document.getElementById("new").nextSibling.contentWindow.document.getElementById("selection_field").style.display = "none";
														
														//IDENTIFY LINES THAT HAD CHANGES AND ADD A CLASS TO THE PARENT DIV THAT REPRESENTS THE LINE
														var dels = newWin.document.getElementById("old").nextSibling.contentWindow.document.getElementById("content_changes").querySelectorAll("del");
														for (var i = 0; i < dels.length; i++)
														{
															dels[i].parentElement.classList.add("hasDel");
														}

														var ins = newWin.document.getElementById("new").nextSibling.contentWindow.document.getElementById("content_changes").querySelectorAll("ins");
														for (var i = 0; i < ins.length; i++)
														{
															ins[i].parentElement.classList.add("hasIns");
														}
													}
												});//end LoadDiffs message handler

										    }										  
										});//end Review Changes post message handler
										
									}
								}//end LoaderLoaded
							}
						});						
						
					}
					else
					{
						eStatusMessage.innerHTML = "<b>Enhanced Formula Editor Extension - Action Required</b><br>The subscription license key entered on the extension options page is either not valid or the subscription is not active.<br>" + sGetLicenseKeyButton + sManageSubscriptionButton + sOptionsButton;
						eStatusMessage.style.display = "block";
					}
				})
				.catch(function (err)
				{
					eStatusMessage.innerHTML = "<b>Enhanced Formula Editor Extension</b><br>An error occurred validating the subscription license key.<br>" + sGetLicenseKeyButton + sManageSubscriptionButton + sOptionsButton;
					eStatusMessage.style.display = "block";
				});
			}
			else
			{
				eStatusMessage.innerHTML = "<b>Enhanced Formula Editor Extension - Action Required</b><br>This extension requires a subscription license key as of February 1st, 2021. Click the 'Get a License Key' button below and follow the 3-step process to get started (includes a 14-day free trial).<br><br>If you previously had a subscription through the Google Chrome Web Store, you must still set up a new subscription in order to get a license key.<br>" + sGetLicenseKeyButton + sOptionsButton;
				eStatusMessage.style.display = "block";
			}
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

function convert15Idto18(sId)
{
	var s = "";
	for (var i = 0; i < 3; i++) {
		var f = 0;
		for (var j = 0; j < 5; j++) {
			var c = sId.charAt(i * 5 + j);
			if (c >= "A" && c <= "Z") f += 1 << j;
		}
		s += "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345".charAt(f);
	}
	return sId + s;
}
