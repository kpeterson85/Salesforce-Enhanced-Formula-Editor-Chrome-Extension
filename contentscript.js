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
	
	if (sId != "")
	{		
		//some pages like 'add formula field' pages have hidden inputs
		//with the same id's as above so we must specify that it's a text area
		if (document.getElementById(sId).tagName == "TEXTAREA")
		{
			var hiddenBaseURL = document.createElement("input")
			hiddenBaseURL.id = "ForceFormulaEditorBaseURL";
			hiddenBaseURL.type = "hidden";
			hiddenBaseURL.value = chrome.extension.getURL("");
			document.getElementsByTagName("body")[0].appendChild(hiddenBaseURL);		
			
			var loader = document.createElement("script");
			loader.type = "text/javascript";
			loader.src = chrome.extension.getURL("edit_area_loader.js");
			loader.charset = "UTF-8";
			loader.onload = loaderLoaded;
			document.getElementsByTagName("head")[0].appendChild(loader);		

			function loaderLoaded()
			{								
				var jqueryScript = document.createElement("script");
				jqueryScript.type = "text/javascript";
				jqueryScript.src = chrome.extension.getURL("jquery.min.js");
				jqueryScript.charset = "UTF-8";
				document.getElementsByTagName("head")[0].appendChild(jqueryScript);
				
				var jsforceScript = document.createElement("script");
				jsforceScript.type = "text/javascript";
				jsforceScript.src = chrome.extension.getURL("jsforce-core.min.js");
				jsforceScript.charset = "UTF-8";
				document.getElementsByTagName("head")[0].appendChild(jsforceScript);
				
				var activate = document.createElement("script");
				activate.type = "text/javascript";
				activate.src = chrome.extension.getURL("activate_editor.js");
				activate.charset = "UTF-8";
				document.getElementsByTagName("head")[0].appendChild(activate);
			}
		}
	}
}
