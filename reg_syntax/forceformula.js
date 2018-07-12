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
};
