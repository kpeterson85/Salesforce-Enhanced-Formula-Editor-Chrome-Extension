editAreaLoader.load_syntax["forceformula"] = {
	'DISPLAY_NAME' : 'Force Formula'
	,'COMMENT_SINGLE' : {}
	,'COMMENT_MULTI' : {'/*' : '*/'}
	,'QUOTEMARKS' : {1: "'", 2: '"'}
	,'KEYWORD_CASE_SENSITIVE' : false
	,'KEYWORDS' : {
		'statements' : [
			'AND','CASE','IF','OR'
		]
		,'functions' : [
			'ABS','ADDMONTHS','BEGINS','BLANKVALUE','BR','CASESAFEID','CEILING','CONTAINS','CURRENCYRATE','DATE','DATETIMEVALUE','DATEVALUE','DAY','DISTANCE','EXP','FIND','FLOOR','GEOLOCATION','GETSESSIONID','HOUR','HYPERLINK','IMAGE','INCLUDES','ISBLANK','ISCHANGED','ISCLONE','ISNEW','ISNULL','ISNUMBER','ISPICKVAL','LEFT','LEN','LN','LOG','LOWER','LPAD','MAX','MCEILING','MFLOOR','MID','MILLISECOND','MIN','MINUTE','MOD','MONTH','NOT','NOW','NULLVALUE','PRIORVALUE','REGEX','RIGHT','ROUND','RPAD','SQRT','SECOND','SUBSTITUTE','TEXT','TIMENOW','TIMEVALUE','TODAY','TRIM','UPPER','VALUE','WEEKDAY','VLOOKUP','YEAR'
		]
		,'reserved' : [
			'true','false'
		]
	}
	,'OPERATORS' :[
		'+', '-', '/', '*', '=', '<', '>'
	]
	,'DELIMITERS' :[
		'(', ')'
	]
	,'REGEXPS' : {
		'customfields' : {
			'search' : '()([a-zA-Z0-9_]+__c)()'
			,'class' : 'customfields'
			,'modifiers' : 'gi'
			,'execute' : 'before' // before or after
		},
		'relationships' : {
			'search' : '()([a-zA-Z0-9_]+__r)()'
			,'class' : 'relationships'
			,'modifiers' : 'gi'
			,'execute' : 'before' // before or after
		}
	}
	,'STYLES' : {
		'COMMENTS': 'color: #AAAAAA;'
		,'QUOTESMARKS': 'color: #879EFA;'
		,'KEYWORDS' : {
			'reserved' : 'color: #48BDDF;'
			,'functions' : 'color: #0040FD;'
			,'statements' : 'color: #60CA00;'
		}
		,'OPERATORS' : 'color: #FF00FF;'
		,'DELIMITERS' : 'color: #2B60FF;'
		,'REGEXPS' : {
			'customfields': 'color: #000000;',
			'relationships': 'color: #000000;'
		}
	}	
	,'AUTO_COMPLETION' :  {
		"default": {	// the name of this definition group. It's posisble to have different rules inside the same definition file
			"REGEXP": { "before_word": "[^a-zA-Z0-9_\$]"	// \\s|\\.|
						,"possible_words_letters": "[a-zA-Z0-9_\$]+"
						,"letter_after_word_must_match": "[^a-zA-Z0-9_]|$"
						,"prefix_separator": "\\."
					}
			,"CASE_SENSITIVE": false
			,"MAX_TEXT_LENGTH": 100		// the maximum length of the text being analyzed before the cursor position
			,"KEYWORDS": {
				/*
				EXAMPLE BELOW COPIED FROM .JS LANGUAGE FILE
				'': [	// the prefix of thoses items

						 0 : the keyword the user is typing
						 1 : (optionnal) the string inserted in code ("{@}" being the new position of the cursor, "~" beeing the equivalent to the value the typed string indicated if the previous )
						 		If empty the keyword will be displayed
						 2 : (optionnal) the text that appear in the suggestion box (if empty, the string to insert will be displayed)
						 
						 ['Array', '~()', '']
			    		,['alert', '~({@})', 'alert(String message)']
			    		,['document']
			    		,['window']
			    	]
		    	,'window' : [
			    		 ['location']
			    		,['document']
			    		,['scrollTo', 'scrollTo({@})', 'scrollTo(Int x,Int y)']
					]
		    	,'location' : [
			    		 ['href']
					]
				*/
			}
		}
	}
};
