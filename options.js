//LOCATED IN BACKGROUND.JS FILE TOO
var sAPIClientId = "3MVG9p1Q1BCe9GmALL6RB0m5Kl5Hr1gFOLLDZ9w1bcNcj9gTKsxvnILXcaFZ2PjVF2NXxpNvUqSrjnpWBsJ.0";

document.addEventListener('DOMContentLoaded', function()
{
	chrome.storage.sync.get(['FormulaEditorLicense'], function(result)
	{
		//console.log('Value is set to ' + value);
		
		if (typeof(result.FormulaEditorLicense) != "undefined")
		{
			document.getElementById("license").value = result.FormulaEditorLicense;
		}
	});
	
	DisplayConnectedAccountsTable(false);	
	
	var code = getURLParameter('code');
	var state = getURLParameter('state'); //contains the original login url
	if (code != null)
	{
		//web server flow
		var url = state+'/services/oauth2/token';
		var body = ('grant_type=authorization_code&client_id='+encodeURIComponent(sAPIClientId)
				+'&redirect_uri='+encodeURIComponent('chrome-extension://'+chrome.runtime.id+'/options.html')
				+'&code='+encodeURIComponent(code));
		
		var oAccessInfo = {};
		
		//exchange code for access token
		fetch(url, {
			method: "POST",
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: body
		})
		.then((res) => res.json())
		.then(function (data)
		{
			console.log("access token");
			console.log(data);
			
			oAccessInfo = data;
			
			oAccessInfo.userId = data.id.split('/')[5];
			oAccessInfo.orgId = data.id.split('/')[4];
			
			//get user info
			fetch(data.id, {
				method: "GET",
				headers: {
					'Authorization' : 'Bearer ' + data.access_token,
				}
			})
			.then((res) => res.json())
			.then(function (data)
			{
				console.log("user info");
				console.log(data);
			
				oAccessInfo.username = data.username;
				oAccessInfo.first_name = data.first_name;
				oAccessInfo.last_name = data.last_name;
				
				console.log("final access object");
				console.log(oAccessInfo);
				
				chrome.storage.sync.get(['FormulaEditorAccessTokens'], function(result)
				{
					//console.log('Value is set to ' + value);
					
					result.FormulaEditorAccessTokens = result.FormulaEditorAccessTokens || {};
					
					result.FormulaEditorAccessTokens[oAccessInfo.userId+'_'+oAccessInfo.orgId] = oAccessInfo;
					
					console.log("updating storage");
					console.log(result.FormulaEditorAccessTokens);
									
					chrome.storage.sync.set({'FormulaEditorAccessTokens': result.FormulaEditorAccessTokens}, function()
					{
						//console.log('Value is set to ' + value);
						DisplayConnectedAccountsTable(false);
						
						document.getElementById("statusConnect").innerHTML = "You successfully connected your account!<br><br>You may need to refresh Salesforce formula pages for the update to take effect.";
						document.getElementById("statusConnect").classList.remove("error");
						document.getElementById("statusConnect").classList.add("success");
						document.getElementById("statusConnect").style.display = "block";
					});
				});			
				

			})
			.catch(function (err)
			{
				document.getElementById("statusLicense").innerHTML = "An error occurred aquiring access token. Please try again.";
				document.getElementById("statusLicense").classList.remove("success");
				document.getElementById("statusLicense").classList.add("error");
				document.getElementById("statusLicense").style.display = "block";
			});
			
		})
		.catch(function (err)
		{
			document.getElementById("statusLicense").innerHTML = "An error occurred aquiring access token. Please try again.";
			document.getElementById("statusLicense").classList.remove("success");
			document.getElementById("statusLicense").classList.add("error");
			document.getElementById("statusLicense").style.display = "block";
		});		
		
	}
	
	var error = getURLParameter('error');
	if (error != null)
	{
		DisplayConnectedAccountsTable(true);
		
		document.getElementById("statusConnect").innerHTML = "Access was not granted.";
		document.getElementById("statusConnect").classList.remove("success");
		document.getElementById("statusConnect").classList.add("error");
		document.getElementById("statusConnect").style.display = "block";
	}
	
	document.getElementById('licenseForm').addEventListener('submit', function(e)
	{
		var sKey = document.getElementById("license").value;
		
		if (sKey.trim() != "")
		{
			chrome.storage.sync.set({'FormulaEditorLicense': sKey}, function()
			{
				//console.log('Value is set to ' + value);
			});
		}
		else
		{
			chrome.storage.sync.remove(['FormulaEditorLicense'], function()
			{
				//console.log("removed");
			});
		}
		
		
		if (sKey.trim() != "")
		{
			fetch("https://www.enhancedformulaeditor.com/subscription-check.php", {
				method: "POST",
				headers: {
					Accept: "text/plain", //use text/plain instead of application/json to avoid preflight CORS request https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
					"Content-Type": "text/plain",
				},
				body: JSON.stringify({
					key: sKey
				}),
			})
			.then((res) => res.json())
			.then(function (data)
			{
				if (
					data.success
				)
				{
					document.getElementById("statusLicense").innerHTML = "Subscription license key validated successfully!<br><br>You may need to refresh Salesforce formula pages for the update to take effect.";
					document.getElementById("statusLicense").classList.remove("error");
					document.getElementById("statusLicense").classList.add("success");
					document.getElementById("statusLicense").style.display = "block";
				}
				else
				{
					document.getElementById("statusLicense").innerHTML = "The subscription license key entered is either not valid or the subscription is not active.";
					document.getElementById("statusLicense").classList.remove("success");
					document.getElementById("statusLicense").classList.add("error");
					document.getElementById("statusLicense").style.display = "block";
				}
			})
			.catch(function (err)
			{
				document.getElementById("statusLicense").innerHTML = "An error occurred validating the subscription license key. Please try again.";
				document.getElementById("statusLicense").classList.remove("success");
				document.getElementById("statusLicense").classList.add("error");
				document.getElementById("statusLicense").style.display = "block";
			});
		}
		else
		{
			document.getElementById("statusLicense").innerHTML = "No key provided";
			document.getElementById("statusLicense").classList.remove("success");
			document.getElementById("statusLicense").classList.add("error");
			document.getElementById("statusLicense").style.display = "block";
		}
		
		e.preventDefault();
		
		return false;
	});
	
	function RedirectToSalesforceToConnect()
	{
		var server = 'https://login.salesforce.com';
		if (document.getElementById("grantAccessServerType").value == "1")
		{
			server = 'https://test.salesforce.com';
		}
		var scopes = ['web','api','refresh_token'];
		//User Agent Flow
		var url = server+'/services/oauth2/authorize?response_type=code'
				+'&client_id=' + sAPIClientId
				+'&state='
					+encodeURIComponent(server)
				//only for web server
				+'&immediate=false'
				+'&prompt=login'
				+'&redirect_uri='
					+encodeURIComponent('chrome-extension://'+chrome.runtime.id+'/options.html')
				+'&scope='
					+scopes.join('%20')
				+'&display=popup';
		window.location.href = url;
	}
	
	document.getElementById('ShowGrantAccessPopup').addEventListener('click', function(e)
	{
		document.getElementById('grantPopupOverlay').style.display = "";
		document.getElementById('grantPopup').style.display = "";
	});	
	
	document.getElementById('GrantAccess').addEventListener('click', function(e)
	{
		RedirectToSalesforceToConnect();
	});
	
	var connect = getURLParameter('connect');
	if (connect != null && connect == "1")
	{
		document.getElementById('ShowGrantAccessPopup').click();
	}
});

function getURLParameter(name) {
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

function DisplayConnectedAccountsTable(bForceShowAccountsSection)
{
	chrome.storage.sync.get(['FormulaEditorAccessTokens'], function(result)
	{
		result.FormulaEditorAccessTokens = result.FormulaEditorAccessTokens || {};
		
		console.log(result.FormulaEditorAccessTokens);
		
		var sHTML = '<table cellspacing="0" cellpadding="5" border="1" style="border-collapse: collapse;"><thead><tr>'
			+'<th scope="col">User</th>'
			+'<th scope="col">Email</th>'
			+'<th scope="col">Instance URL</th>'
			+'<th scope="col">Org Id</th>'
			+'<th scope="col"/>'
			+'<tr></thead><tbody>';

		//sort refresh tokens by username
		var sorted = [];
		for(var key in result.FormulaEditorAccessTokens)
		{
			sorted.push(result.FormulaEditorAccessTokens[key]);
		}		
		
		//IF WE FOUND ENTRIES FOR CONNECTED ACCOUNTS THEN LOAD THEM ON THE PAGE, OTHERWISE DON'T SHOW THE SECTION BECAUSE NOT ALL
		//USERS USE THE CONNECTED ACCOUNTS FEATURE (IF THE SID SESSION COOKIE IS AVAILABLE)
		if (sorted.length > 0 || bForceShowAccountsSection == true)
		{
			sorted.sort(function(a,b)
			{
				if(!a) return 1;
				if(!b) return -1;
				var a = (a.username || '').toLowerCase();
				var b = (b.username || '').toLowerCase();
				if(a < b) return -1;
				else if(a > b) return 1;
				return 0;
			});

			//creates a row for each stored token
			for(var i = 0; i < sorted.length; i++)
			{

				//gets the instance name
				var instance = (sorted[i].instance_url) || '';
				instance = instance.replace('https://','').split('.')[0];

				sHTML += '<tr>'
						+'<td >'
							+(sorted[i].first_name || '') +' '
							+sorted[i].last_name					
						+'</td>'
						+'<td>' + sorted[i].username + '</td>'
						+'<td >'+instance+'</td>'
						+'<td >'+ sorted[i].orgId +'</td>'
						+'<td><button class="btn-delete" data-key="' + sorted[i].userId + '_' + sorted[i].orgId + '">Delete</button></td>'
					+'</tr>';


			}
			
			sHTML += '</tbody></table>';
			
			//show the connected accounts table and section
			document.getElementById('connectedAccountsShell').innerHTML = sHTML;
			document.getElementById('connectedAccountsSection').style.display = 'block';
		
			//login button handler
			document.querySelectorAll('button.btn-delete').forEach(function(btnDelete)
			{
				btnDelete.addEventListener("click", function()
				{
					var sKey = this.getAttribute('data-key');

					chrome.storage.sync.get(['FormulaEditorAccessTokens'], function(result)
					{
						//console.log('Value is set to ' + value);
						
						result.FormulaEditorAccessTokens = result.FormulaEditorAccessTokens || {};
						
						var oAccessInfo = result.FormulaEditorAccessTokens[sKey];
						
						delete result.FormulaEditorAccessTokens[sKey];
						
						console.log("updating storage");
						console.log(result.FormulaEditorAccessTokens);
						
						if (Object.keys(result.FormulaEditorAccessTokens).length > 0)
						{
							//IF WE STILL HAVE ACCESS TOKENS THEN UPDATE THE CHROME STORAGE ENTRY
							chrome.storage.sync.set({'FormulaEditorAccessTokens': result.FormulaEditorAccessTokens}, function()
							{
								//console.log('Value is set to ' + value);
								DisplayConnectedAccountsTable(false);
							});
						}
						else
						{
							//IF WE DON'T HAVE ANY ACCESS TOKENS LEFT THEN DELETE THE CHROME STORAGE ENTRY
							chrome.storage.sync.remove(['FormulaEditorAccessTokens'], function()
							{
								//console.log("removed");
								DisplayConnectedAccountsTable(false);
							});
						}
						
						//the chrome storage updates above are async so this will run even while we are waiting for them to complete
						//revoke the access/refresh tokens in Salesforce, do this last in case it fails for some reason we've at least forgotten the info in the extension and won't use it anymore
						var server = 'https://login.salesforce.com';
						if (oAccessInfo.id.indexOf("test.salesforce.com") != -1)
						{
							server = 'https://test.salesforce.com';
						}
						fetch(server + '/services/oauth2/revoke', {
							method: "POST",
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded'
							},
							body: 'token=' + oAccessInfo.refresh_token
						})
						.then(function ()
						{
							console.log("refresh token revoked");
						})
						.catch(function (err)
						{
							console.log("error revoking refresh token");
						});	
						
					});		
				});
			});
		}
		else
		{
			//hide the connected accounts area
			document.getElementById('connectedAccountsShell').innerHTML = "";
			document.getElementById('connectedAccountsSection').style.display = 'none';
		}
		


	});
}
	



