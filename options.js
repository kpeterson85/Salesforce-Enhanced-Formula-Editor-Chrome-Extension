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
		
		chrome.storage.sync.set({'FormulaEditorLicense': sKey}, function()
		{
			//console.log('Value is set to ' + value);
		});
		
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
					document.getElementById("status").innerHTML = "Success!: " + JSON.stringify(data);
				}
				else
				{
					document.getElementById("status").innerHTML = "Error: " + JSON.stringify(data);
				}
			})
			.catch(function (err)
			{
				document.getElementById("status").innerHTML = "Error: " + err;
			});
		}
		else
		{
			document.getElementById("status").innerHTML = "No key provided";
		}
		
		e.preventDefault();
		
		return false;
	});
});

	
	
	



