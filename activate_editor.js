editAreaLoader.window_loaded();

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

var textarea = document.getElementById(sId);
//textarea.style.wordWrap = "normal !important";
//textarea.style.whiteSpace = "nowrap !important"

editAreaLoader.init({
	id: sId	// id of the textarea to transform		
	,start_highlight: true	// if start with highlight
	,allow_resize: "both"
	,allow_toggle: true
	,word_wrap: false
	,language: "en"
	,syntax: "forceformula"
	,replace_tab_by_spaces: 2
	,font_size: "8"
	,font_family: "verdana, monospace"
	,min_height: 400
	,min_width: 600
	,show_line_colors: true
	,EA_load_callback: "EALoaded"
});

//execute this manually because chrome doesn't recognize off on intial load?
//the textarea[wrap=off] useragent styles don't apply initially for some reason
function EALoaded()
{
	editAreaLoader.execCommand(sId, 'set_word_wrap', true);
	editAreaLoader.execCommand(sId, 'set_word_wrap', false);
}