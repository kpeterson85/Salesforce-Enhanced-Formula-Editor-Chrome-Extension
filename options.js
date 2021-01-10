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
					Accept: "application/json",
					"Content-Type": "application/json",
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
					document.getElementById("status").innerHTML = "Subscription license key validated successfully!<br><br>You may need to refresh Salesforce formula pages for the update to take effect.";
					document.getElementById("status").classList.remove("error");
					document.getElementById("status").classList.add("success");
					document.getElementById("status").style.display = "block";
				}
				else
				{
					document.getElementById("status").innerHTML = "The subscription license key entered is either not valid or the subscription is not active.";
					document.getElementById("status").classList.remove("success");
					document.getElementById("status").classList.add("error");
					document.getElementById("status").style.display = "block";
				}
			})
			.catch(function (err)
			{
				document.getElementById("status").innerHTML = "An error occurred validating the subscription license key. Please try again.";
				document.getElementById("status").classList.remove("success");
				document.getElementById("status").classList.add("error");
				document.getElementById("status").style.display = "block";
			});
		}
		else
		{
			document.getElementById("status").innerHTML = "No key provided";
			document.getElementById("status").classList.remove("success");
			document.getElementById("status").classList.add("error");
			document.getElementById("status").style.display = "block";
		}
		
		e.preventDefault();
		
		return false;
	});
});

	
	
	



