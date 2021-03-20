init();

function init() {
	
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
	
	//some pages like 'add formula field' pages have hidden inputs
	//with the same id's as above so we must specify that it's a text area
	if (sId != "" && document.getElementById(sId).tagName == "TEXTAREA")
	{
		LoadEditorFiles(document);
	}
	else if (document.location.pathname.indexOf("flowBuilder.app") != -1 || document.location.pathname.indexOf("processui.app") != -1)
	{
		//some pages load formula fields dynamically so we have to lazy load the editor as the fields become available
		var observer = new MutationObserver(function(mutations)
		{
			mutations.forEach(function(mutation)
			{
				if (!mutation.addedNodes) return;

				var elements = document.querySelectorAll("textarea[name='Formula'], textarea[name='formulaExpression'], div.processuicommonFormulaBuilder textarea");

				if (elements.length > 0) //we add the id ourselves so if it exists it means we've already seen this field
				{
					for (var e = 0; e < elements.length; e++)
					{
						if (elements[e].classList.contains("enhanced") == false)
						{
							console.log("Found lazy load formula field");
					
							elements[e].classList.add("enhanced");
							
							var btnOpen = document.createElement("input");
							btnOpen.type = "button";
							btnOpen.value = "Open Enhanced Formula Editor";
							btnOpen.setAttribute("style", "margin-left: 10px;");
							
							var componentRoot = elements[e].closest(".property-input"); //FLOW formulas
							if (componentRoot == null)
							{
								componentRoot = elements[e].closest(".formulaBuilder"); //Proccess builder criteria formulas
							}
							if (componentRoot == null)
							{
								componentRoot = elements[e].closest(".inlineFormulaBuilder"); //Proccess builder update record field formulas
							}
							
							if (componentRoot != null)
							{
								componentRoot.querySelector("label").appendChild(btnOpen);
								
								btnOpen.editorField = elements[e];

								btnOpen.addEventListener("click", function()
								{
									var btn = this;
									
									if (typeof(btn.popup) == "undefined" || btn.popup == null)
									{
										var newWin = open('','Formula Editor - ' + btn.editorField.id,'height=500,width=700'); //unique name with field id so multiple windows can be opened
										btn.popup = newWin;
										
										var popupTitle = document.createElement("title");
										popupTitle.innerText = "Formula Editor Popup";
										newWin.document.head.appendChild(popupTitle);
										
										var popupTextarea = document.createElement("textarea");
										popupTextarea.id = "CalculatedFormula";
										popupTextarea.value = btn.editorField.value;
										popupTextarea.setAttribute("data-editor-popup", "true");						
										newWin.document.body.appendChild(popupTextarea);
										
										newWin.editorField = btn.editorField;
										newWin.btn = btn;
										
										newWin.addEventListener("message", function(event)
										{
										  //receive the postmessage from the popup window (sent from activate_editor) which contains the updated formula
										  newWin.editorField.value = event.data;										  
										  
										  newWin.close();
										});
										
										newWin.addEventListener("beforeunload", function(e)
										{
										   this.btn.popup = null;
										}, false);

										LoadEditorFiles(newWin.document);
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
	
	function LoadEditorFiles(elDocument)
	{
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
					
					var activate = elDocument.createElement("script");
					activate.type = "text/javascript";
					activate.src = chrome.extension.getURL("activate_editor.js");
					activate.charset = "UTF-8";
					elDocument.getElementsByTagName("head")[0].appendChild(activate);
				});
			}
		}
	}

}
