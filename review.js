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

var loader = document.createElement("script");
loader.type = "text/javascript";
loader.src = document.currentScript.src.replace("review.js", "edit_area_loader.js"); //grab the current chrome extension file url and swap the file name for another chrome extension file url
loader.charset = "UTF-8";
loader.onload = loaderLoaded;
document.body.appendChild(loader);	

//cause window load to fire so the editarea loader script knows the window is ready since we are adding it to a popup where window loaded already fire
setTimeout(function(){
	dispatchEvent(new Event('load'));
}, 100);