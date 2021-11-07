chrome.runtime.onMessage.addListener(function(message, sender, reply) {
	//LOCATED IN OPTIONS.JS TOO
	var sAPIClientId = "3MVG9p1Q1BCe9GmALL6RB0m5Kl5Hr1gFOLLDZ9w1bcNcj9gTKsxvnILXcaFZ2PjVF2NXxpNvUqSrjnpWBsJ.0";

	if (message.type == "FormulaEditorAccessTokenCheck")
	{
		var oAccessInfo = message.data;

		fetch(oAccessInfo.id, {
			method: "GET",
			headers: {
				'Authorization': 'Bearer ' + oAccessInfo.access_token
			}
		})
		.then((res) => res.json())
		.then(function (data)
		{
			//ACCESS TOKEN GOOD SO RETURN AS IS
			reply(oAccessInfo);
		})
		.catch(function (err)
		{
			//console.log("Access token error, attempting refresh token");
			
			//ACCESS TOKEN HAD AN ERROR, TRY REFRESH TOKEN
			fetch(oAccessInfo.instance_url + "/services/oauth2/token?grant_type=refresh_token&client_id=" + sAPIClientId + "&refresh_token=" + oAccessInfo.refresh_token, {
				method: "POST"
			})
			.then((res) => res.json())
			.then(function (data)
			{
				//console.log("refresh response");
				//console.log(data);
			
				oAccessInfo.access_token = data.access_token;
				
				chrome.storage.sync.get(['FormulaEditorAccessTokens'], function(result)
				{
					//console.log('Value is set to ' + value);
					
					result.FormulaEditorAccessTokens = result.FormulaEditorAccessTokens || {};
					
					result.FormulaEditorAccessTokens[oAccessInfo.userId+'_'+oAccessInfo.orgId] = oAccessInfo;
					
					//console.log("updating storage");
					//console.log(result.FormulaEditorAccessTokens);
									
					chrome.storage.sync.set({'FormulaEditorAccessTokens': result.FormulaEditorAccessTokens}, function()
					{
						//response with updated access info
						reply(oAccessInfo);
					});
				});			
				

			})
			.catch(function (err)
			{
				console.log("Error refreshing token");
				console.log(err);
			});
		});
		
		return true; //RETURN TRUE SINCE WE ARE DOING ASYNCHRONOUS CALLS WITHIN THE FUNCTION AND WE DON'T WANT THE MESSAGE KILLED BEFORE WE CN RESPOND
	}
});