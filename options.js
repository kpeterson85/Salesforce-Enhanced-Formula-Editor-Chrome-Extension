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
	
	DisplayConnectedAccountsTable();	
	
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
						DisplayConnectedAccountsTable();
						
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
	
	document.getElementById('ConnectToSalesforce').addEventListener('click', function(e)
	{
		RedirectToSalesforceToConnect();
	});
	
	var connect = getURLParameter('connect');
	if (connect != null && connect == "1")
	{
		RedirectToSalesforceToConnect();
	}
});

function getURLParameter(name) {
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

function DisplayConnectedAccountsTable()
{
	chrome.storage.sync.get(['FormulaEditorAccessTokens'], function(result)
	{
		result.FormulaEditorAccessTokens = result.FormulaEditorAccessTokens || {};
		
		console.log(result.FormulaEditorAccessTokens);
		
		var sHTML = '<table cellspacing="0" cellpadding="5" border="1" style="border-collapse: collapse;"><thead><tr>'
			+'<th scope="col">User</th>'
			+'<th scope="col">Email</th>'
			+'<th scope="col">Instance URL</th>'
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
		if (sorted.length > 0)
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
						+'<td><button class="btn-delete" data-key="' + sorted[i].userId + '_' + sorted[i].orgId + '">Delete</button></td>'
					+'</tr>';


			}
			
			sHTML += '</tbody></table>';
			
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
						
						delete result.FormulaEditorAccessTokens[sKey];
						
						console.log("updating storage");
						console.log(result.FormulaEditorAccessTokens);
										
						chrome.storage.sync.set({'FormulaEditorAccessTokens': result.FormulaEditorAccessTokens}, function()
						{
							//console.log('Value is set to ' + value);
							DisplayConnectedAccountsTable();
						});
					});		
				});
			});
		}	
		


	});
}
	



