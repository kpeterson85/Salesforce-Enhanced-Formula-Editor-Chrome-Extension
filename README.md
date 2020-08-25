# Overview

The Salesforce Enhanced Formula Editor chrome extension enhances the formula textareas with the Edit Area code editor and provides a Load Field Details button that provides details about the fields found in the formula.

Editor Feature Includes:
- Syntax highlighting
- Tabbing (tab and shift-tab)
- Parentheses matching
- Find and Replace
- No code wrapping
- Resize editor window by clicking bottom right corner
- Full screen feature

A new button is created named "Load Field Details" that loads details about the fields found in the formula.

Field Details Feature Includes:
- Field type
- How many times it is used
- Formula field compile sizes
- Field edit links
- Field record values
- Field Sub Details (shown by clicking the expand arrow)
  - Object Name
  - Field Label
  - Field Help Text
  - For picklist fields, their picklist values
  - For formula fields, their formula

Formula fields found in the formula will load the enhanced editor for their own formulas, even providing the Load Field Details for themselves, which allows you to drill down through all formulas used in the parent formula.

## Overview Video

[![Video](http://img.youtube.com/vi/TW6NCtO67I8/0.jpg)](http://www.youtube.com/watch?v=TW6NCtO67I8)

## How it Works

The extension looks for textareas with certain "id" attributes to identify formula input boxes.  If one is found then it loads the Edit Area code editor using a custom language definition file for the Salesforce formula language.

If the extension can identify what object the formula is on then it will provide the "Load Field Details" button.  The "Load Field Details" button parses out the fields and lists them on the page.  The [jsforce](https://github.com/jsforce/jsforce) library is used to piggy back off the current user's session id for loading the features below:
- To query the the Metadata API for the field type and sub detail information. 
- To query the Tooling API for field ids to load the Edit links directly to the fields.
- To query the REST API for SOQL queries to return field values for a record.
 
## Getting the Extension

Install from the [chrome web store](https://chrome.google.com/webstore/detail/salesforcecom-enhanced-fo/cnlnnpnjccjcmecojdhgpknalcahkhio)

The installed extension will automatically receive updates
