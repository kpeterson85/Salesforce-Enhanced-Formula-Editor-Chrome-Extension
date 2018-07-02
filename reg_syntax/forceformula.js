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
