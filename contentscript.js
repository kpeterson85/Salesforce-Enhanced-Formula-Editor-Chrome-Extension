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
		LoadEditorFiles(document, document.getElementById(sId));
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
										  //receive the postmessage from the popup window (sent from activate_editor) which contains the updated formula
										  newWin.editorField.value = event.data;
										  
										  //TRIGGER THE NATIVE CHANGE EVENT ON THE FIELD SO OTHER SALESFORCE FEATURES PICK UP ON THE CHANGE AND THE NEW CONTENT GETS SAVED
										  newWin.editorField.dispatchEvent(new Event('change'));
										  
										  newWin.close();
										});
										
										newWin.addEventListener("beforeunload", function(e)
										{
										   this.btn.popup = null;
										}, false);

										LoadEditorFiles(newWin.document, popupTextarea);
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
	
	function LoadEditorFiles(elDocument, elTextField)
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
							var sOrdId = convert15Idto18(readCookie("oid"));
							
							//IF WE HAVE ACCESS TOKEN INFO ON FILE THEN CHECK IT, OTHERWISE LOAD THE FILES WITHOUT IT
							var oAccessInfo = null;
							var sAccessToken = "";
							for (var key in result.FormulaEditorAccessTokens)
							{
								//key is in the format sUserId+'_'+sOrgId but we aren't given the user id in any cookies so we just look it up based on org id
								if (result.FormulaEditorAccessTokens.hasOwnProperty(key) && key.endsWith(sOrdId))
								{
									oAccessInfo = result.FormulaEditorAccessTokens[key];
									break;
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
									}
								}
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
