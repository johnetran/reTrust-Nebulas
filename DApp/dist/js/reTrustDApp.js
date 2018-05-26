
const DURATION_AUTOREFRESHACCOUNT = 15000;
const DURATION_AUTOREFRESHCOUNTDOWN = 1000;

var txRefreshCount = 0;
var autoRefreshAccountHandle = null;
var autoRefreshAccountCountDown = DURATION_AUTOREFRESHACCOUNT / DURATION_AUTOREFRESHCOUNTDOWN;

$(function() {
	if(typeof(webExtensionWallet) === "undefined"){
		showErrorCard("WebExtentionWallet Not Installed", "Please install WebExtentionWallet", "The WebExtentionWall is needed in order for you to choose the Nebulas address locally to interact with the <strong>re:Trust</strong> DApp. The WebExtentionWallet works with the Google Chrome desktop browser and can be downloaded here: <a href='https://github.com/ChengOrangeJu/WebExtensionWallet' target='_blank'>https://github.com/ChengOrangeJu/WebExtensionWallet</a>");
		disable("#findAgreement");
		hideSection("#accountinfo");
	}
	else{
		hideErrorCard();
		showSection("#accountinfo");
	}

	/*
	$('#modalcard').modal({
		show: false
	});
	*/

	$( "#getAccount" ).click(getAccount);
	$(	"#autoRefreshAccount" ).change(autoRefreshAccountChanged);	
	$( "input[name='nebnetwork']" ).click(nebnetworkClicked);
	$( "#findAgreement" ).click(findAgreementClick);
	$( "#updateDetails" ).click(updateDetails);
	$( "#initiateAgreement" ).click(initiateAgreementClick);
	$( "input[name='initside']" ).click(initsideClicked);
	$( "#initNextStep" ).click(initNextStepClick);
	$( "#multiSelectBuyer" ).click(multiSelectBuyerClick);
	$( "#multiSelectSeller" ).click(multiSelectSellerClick);
	$( "#addDeposit" ).click(addDepositClick);
	$( "#reclaimDeposit" ).click(reclaimClick);
	$( "#fulfillAgreement" ).click(fulfillClick);
	$( "#releaseAgreement" ).click(releaseClick);


	if (DEFAULT_NEBNET == MAINNET){
		$('#mainnet').prop("checked", true);
	}
	else {
		$('#testnet').prop("checked", true);		
	}


	var urlVars = getUrlVars();
	if (urlVars["ref"]){
		var parts = urlVars["ref"].split("-");
		if (parts.length > 0){
			setVal("#them", parts[0]);
			if (parts.length > 1){
				setVal("#reference", parts[1]);
				findAgreementClick();
			}
		}
	}

	getAccount();
	autoRefreshAccountChanged();
});

// listen message from contentscript
window.addEventListener('message', handleGetAccount);

function startAutoRefreshAccount(){
	getAccount();
	setAutoRefreshAccountCountDown(DURATION_AUTOREFRESHACCOUNT / DURATION_AUTOREFRESHCOUNTDOWN);
	autoRefreshAccountHandle = setInterval(updateAutoRefreshCountDown, DURATION_AUTOREFRESHCOUNTDOWN);
}
function updateAutoRefreshCountDown(){

	if (autoRefreshAccountCountDown == 0){
		getAccount();
		setAutoRefreshAccountCountDown(DURATION_AUTOREFRESHACCOUNT / DURATION_AUTOREFRESHCOUNTDOWN);
	}
	else {
		setAutoRefreshAccountCountDown(autoRefreshAccountCountDown-1);
	}
}
function setAutoRefreshAccountCountDown(value){
	autoRefreshAccountCountDown = value;
	setText("#autoRefreshCountdown", " (" + ("0" + value).slice(-2) + ")");
}
function stopAutoRefreshAccount() {
	if (autoRefreshAccountHandle){
		setText("#autoRefreshCountdown", "");
		clearInterval(autoRefreshAccountHandle);
		autoRefreshAccountHandle = null;	
	}
}
function autoRefreshAccountChanged(){
	if (isChecked("#autoRefreshAccount")){
		startAutoRefreshAccount();
	}
	else {
		stopAutoRefreshAccount();
	}
}

function getAccount(){
	window.postMessage({
		"target": "contentscript",
		"data":{
		},
		"method": "getAccount",
	}, "*");
}
function handleGetAccount(e){
	if(e && e.data && e.data.data && e.data.data.account){

		setText("#accountNet", " " + reTrust.nebNetwork + " ");
		setText("#ouraccount", e.data.data.account);

		var balance = 0;
		getBalance(e.data.data.account, getBalanceSuccess, getBalanceError);
	}
	/*
	if(!!e.data.data.txhash){
	}
	if(!!e.data.data.receipt){
	}
	if(!!e.data.data.neb_call){
	}
	*/
}
function getBalanceSuccess(balance){
	setText("#ourbalance", balance);
}
function getBalanceError(error){
	showErrorCard("ERROR", "Unable to get balance", error);
}
function getBalance (address, successCB, errorCB){
	reTrust.neb.api.getAccountState(address)
		.then(function (resp) {
			if (resp.error) {
				if (errorCB){
					errorCB(resp.error);
				}
			} else {
				var balance = new BigNumber(resp.balance).div(NAS_FACTOR);
				if (successCB) {
					successCB(balance)
				}
			}
		})
		.catch(function (e) {
			// this catches e thrown by nebulas.js!neb
			if (errorCB){
				errorCB(e.message);
			}
	});
}

function hideModalCard(){
	$("#modalcard").modal("hide");
}
function showModalCard(header, title, text){
	/*
	$("#modalcardheader").text(header);
	$("#modalcardtitle").text(title);
	$("#modalcardtext").text(text);	
	$('#modalcard').modal('show');
	*/

	//$( "#juiModal" ).dialog( "open" );

	alert(header + ": " + title + ": " + text);
}
function isChecked(name){
	return $(name).prop('checked');
}
function hideErrorCard(){
	$("#errorcard").addClass("d-none");
}
function showErrorCard(header, title, text){
	$("#errorcardheader").html(header);
	$("#errorcardtitle").html(title);
	$("#errorcardtext").html(text);
	$("#errorcard").removeClass("d-none");		
}
function hideSection(name){
	$(name).addClass("d-none");
}
function showSection(name){
	$(name).removeClass("d-none");
}
function disable(name){
	$(name).prop('disabled', true);
}
function enable(name){
	$(name).prop('disabled', false);
}
function setVal(name, val){
	$(name).val(val);
}
function setText(name, text){
	$(name).text(text);
}
function setHtml(name, html){
	$(name).html(html);
}

function commonTasks(){
	hideErrorCard();
	$("#details .card").removeClass("border-primary");
	getAccount();
}


function showUpdatedDetails(agt, side, highlight){
	$("#detailslist").empty();
	var details = getAgreementDetailsArray(agt, side);
	$.each(details, function( index, value ) {
		$("#detailslist").append($("<li></li>").html(value));
	});

	$("#details .card").removeClass("border-primary")
	if (highlight){
		$("#details .card").addClass("border-primary")
	}

	showSection("#details");
}

function updateDetails(){
	
	getAccount();

	var side = $("#selectedSide").val();
	var them = $("#them").val();
	var reference = $("#reference").val();
	if (!side || !them || !reference){
		return;
	}
	reTrust.getAgreement(side, them, reference, handleUpdateDetails);	
}
function handleUpdateDetails(resp){

	if (resp && resp.result){
		var agt = JSON.parse(resp.result);
		if (agt){
			var side = $("#selectedSide").val();
			showUpdatedDetails(agt, side, true);
		}
	}
}
function showSectionsBasedOnStatus(side, agt){

	var deposit = 0, expected = 0;
	var weinitiated = false, theyinitiated = false;

	if (side == BUYER){
		setVal("#themreadonly", agt.seller);
		setVal("#refreadonly", agt.reference);
		setVal("#selectedSide", BUYER);

		deposit = agt.buyerDepositReceived;
		expected = agt.buyerDepositExpected;
		weinitiated = (agt.buyerStatus != "");
		theyinitiated = (agt.sellerStatus != "");
	}
	else{
		setVal("#themreadonly", agt.buyer);
		setVal("#refreadonly", agt.reference);
		setVal("#selectedSide", SELLER);

		deposit = agt.sellerDepositReceived;
		expected = agt.sellerDepositExpected;
		weinitiated = (agt.sellerStatus != "");
		theyinitiated = (agt.buyerStatus != "");
	}

	showUpdatedDetails(agt, side, false);

	var status = reTrust.agreementStatus(agt);
	switch(status){
		case STATUS_INVALID:
			if (!weinitiated){
				
				if (side == BUYER){
					$('#initsidebuyer').prop("checked", true);
					$("#initiateExpectation").prop("placeholder", "Seller's Deposit")
				}
				else{
					$('#initsideseller').prop("checked", true);
					$("#initiateExpectation").prop("placeholder", "Buyer's Deposit")
				}
			
				disable("input[name=initside]");
				hideSection("#inittextnoagt");
				showSection("#inittextyesagt");
				showSection("#initiate");
			}
			else{
				showSection("#add");
				showSection("#reclaim");	
			}
			break;

		case STATUS_VALID:
			if (new BigNumber(deposit).gt(expected)){
				showSection("#reclaim");
			}

			if (side == SELLER){
				$("#balance").prop("placeholder", "Expected Balance")
			}
			else{
				$("#balance").prop("placeholder", "Balance")
			}
			showSection("#fulfill");
			showSection("#release");
			break;

		default:
			break;
	}
}

function nebnetworkClicked (){
	commonTasks();
	if($('input:radio[name=nebnetwork]:checked').val() == MAINNET){
		reTrust.selectMainnet();
	}
	else{
		reTrust.selectTestnet();		
	}
}

function findAgreementClick(){
	if (!$("#them").val() || !$("#reference").val()){
		showModalCard("ERROR", "Invalid Inputs", "Please check inputs and try again.");
		return;
	}
	_findAgreement($("#them").val(), $("#reference").val(), handleFindAgreement);
}

function _findAgreement(them, reference, callback){
	commonTasks();

	hideSection("#initiate");
	setVal("#initiateDeposit", "")
	setVal("#initiateExpectation", "")
	hideSection("#initStatusSection");
	setHtml("#inithash", "");
	setHtml("#initstatus", "");
	enableInitiate();

	hideSection("#multi");
	hideSection("#themandref");
	setVal("#themreadonly", "")
	setVal("#refreadonly", "")
	
	hideSection("#details")
	
	hideSection("#add")
	setVal("#additionalDeposit", "")
	hideSection("#addStatusSection");
	setHtml("#addhash", "");
	setHtml("#addstatus", "");
	enableAdd();

	hideSection("#reclaim")
	hideSection("#reclaimStatusSection");
	setHtml("#reclaimhash", "");
	setHtml("#reclaimstatus", "");
	enableReclaim();

	hideSection("#fulfill")
	setVal("#balance", "")
	hideSection("#fulfillStatusSection");
	setHtml("#fulfillhash", "");
	setHtml("#fulfillstatus", "");
	enableFulfill();
	
	hideSection("#release")
	setVal("#percentage", "")
	hideSection("#releaseStatusSection");
	setHtml("#releasehash", "");
	setHtml("#releasestatus", "");
	enableRelease();

	reTrust.findAgreement(them, reference, callback);	
}

function handleFindAgreement(resp){
	if (resp){

		if (resp.result){
			var obj = JSON.parse(resp.result);
			if (obj){
				
				// set for subsequent calls
				reTrust.foundAgts = obj;
	
				if (obj.error){
					showModalCard("ERROR", "Error finding agreement", "Error returned by re:Trust Smart Contract: " + obj.error);
					//alert(obj.error); // TODO user model
					//$("#findMsg").text(obj.error).addClass("alert-danger").show(1000);
				}
				else{
					if (!obj.found){
						// agreement not found - initiate
						setVal("#themreadonly", $("#them").val());
						setVal("#refreadonly", $("#reference").val());
						showUpdatedDetails(null, "", false);
						hideSection("#inittextyesagt");
						showSection("#inittextnoagt");
						enableInitiate();
						showSection("#initiate");
					}
					else{
						// agreement found
						if (obj.buyAgt && obj.sellAgt){
							// multiple found
							showSection("#multi");
						}
						else{
							// only one found - buyer or seller side?
							var agt = null, ourside = "";
							if (obj.buyAgt){
								ourside = BUYER;
								agt = obj.buyAgt;
							}
							else if (obj.sellAgt){
								ourside = SELLER;
								agt = obj.sellAgt;
							}
	
							showSectionsBasedOnStatus(ourside, agt);
						}
					}
				}
			}			
		}
		else if (resp.execute_err){
			if (resp.execute_err == "contract check failed"){
				showModalCard("ERROR", "Wrong Nebulas Network", "In your WebExtensionWallet, please select the " + reTrust.nebNetwork + "");
			}
		}

	}
	console.log(resp);
}

function multiSelectBuyerClick(){

	commonTasks();

	if (reTrust && reTrust.foundAgts && reTrust.foundAgts.buyAgt){
		showSectionsBasedOnStatus(BUYER, reTrust.foundAgts.buyAgt);
	}
	else{
		showModalCard("ERROR", "No agreements found", "Something unexpected occured. Please give it another go.")
	}
}
function multiSelectSellerClick(){

	commonTasks();

	if (reTrust && reTrust.foundAgts && reTrust.foundAgts.sellAgt){
		showSectionsBasedOnStatus(BUYER, reTrust.foundAgts.sellAgt);
	}
	else{
		showModalCard("ERROR", "No agreements found", "Something unexpected occured. Please give it another go.")
	}
}


function disableInitiate(){
	disable("input[name=initside]");
	disable("#initiateDeposit");
	disable("#initiateExpectation");
	disable("#initiateAgreement");
}
function enableInitiate(){
	enable("input[name=initside]");
	enable("#initiateDeposit");
	enable("#initiateExpectation");
	enable("#initiateAgreement");
}
function initsideClicked(){
	if($('input:radio[name=initside]:checked').val() == BUYER){
		$("#initiateExpectation").prop("placeholder", "Seller's Deposit")
	}
	else{
		$("#initiateExpectation").prop("placeholder", "Buyer's Deposit")
	}
}
function initiateAgreementClick(){

	commonTasks();

	var side = $('input[name=initside]:checked').val();
	var them = $("#themreadonly").val();
	var reference = $("#refreadonly").val();
	var deposit = $('#initiateDeposit').val();
	var expecation = $("#initiateExpectation").val();

	if (!side || !them || !reference || deposit == "" || isNaN(deposit) || expecation == "" || isNaN(expecation)){
		showModalCard("ERROR", "Invalid Inputs", "Please check inputs and try again.")
		return
	}

	reTrust.initiateAgreement(side, them, reference, deposit, expecation, handleInitiateAgreement);
}
function handleInitiateAgreement(resp){
	if (resp){
		if (typeof resp == "string" && resp.startsWith("Error")){
			showModalCard("ERROR", "Unable To Initiate", resp);
			return;
		}

		disableInitiate();
		startRefreshTimeout(resp, {section: "#initStatusSection", hash: "#inithash", status: "#initstatus", successCB: initSuccess});
	}
	console.log(resp);
}

function initSuccess(resp){
	showSection("#initNextStep");	
}
function initNextStepClick(){
	_findAgreement($("#themreadonly").val(), $("#refreadonly").val(), handleFindAgreement);

}

function disableAdd(){
	disable("input[name=additionalDeposit]");
	disable("#addDeposit");
}
function enableAdd(){
	enable("input[name=additionalDeposit]");
	enable("#addDeposit");
}

function addDepositClick(){
	commonTasks();
	var side = $("#selectedSide").val();
	var them = $("#themreadonly").val();
	var reference = $("#refreadonly").val();
	var deposit = $("#additionalDeposit").val();

	// sanity check
	if (!side || !them || !reference || deposit == "" || isNaN(deposit)){
		showModalCard("ERROR", "Invalid Inputs", "Please start again.")
		return
	}

	reTrust.addDeposit(side, them, reference, deposit, handleAddDeposit);
}
function handleAddDeposit(resp){
	if (resp){
		if (typeof resp == "string" && resp.startsWith("Error")){
			showModalCard("ERROR", "Unable To Add Deposit", resp);
			return;
		}

		disableAdd();
		startRefreshTimeout(resp, {section: "#addStatusSection", hash: "#addhash", status: "#addstatus", successCB: addSuccess});
	}
	console.log(resp);
}
function addSuccess(resp){
	updateDetails();
	setVal("#additionalDeposit", "")
	enableAdd();
}

function disableReclaim(){
	disable("#reclaimDeposit");
}
function enableReclaim(){
	enable("#reclaimDeposit");
}

function reclaimClick(){
	commonTasks();
	var side = $("#selectedSide").val();
	var them = $("#themreadonly").val();
	var reference = $("#refreadonly").val();

	// sanity check
	if (!side || !them || !reference){
		showModalCard("ERROR", "Invalid Inputs", "Please start again.")
		return
	}

	reTrust.reclaimExcessDeposit(side, them, reference, handleReclaim);

}
function handleReclaim(resp){
	if (resp){
		if (typeof resp == "string" && resp.startsWith("Error")){
			showModalCard("ERROR", "Unable To Reclaim Deposit", resp);
			return;
		}

		disableAdd();
		startRefreshTimeout(resp, {section: "#reclaimStatusSection", hash: "#reclaimhash", status: "#reclaimstatus", successCB: reclaimSuccess});
	}
	console.log(resp);
}
function reclaimSuccess(resp){
	updateDetails();
	enableReclaim();
	enableAdd();
}

function disableFulfill(){
	disable("input[name=balance]");
	disable("#fulfillAgreement");
}
function enableFulfill(){
	enable("input[name=balance]");
	enable("#fulfillAgreement");
}
function fulfillClick(){
	commonTasks();
	var side = $("#selectedSide").val();
	var them = $("#themreadonly").val();
	var reference = $("#refreadonly").val();
	var balance = $('#balance').val();

	// sanity check
	if (!side || !them || !reference || balance == "" || isNaN(balance)){
		showModalCard("ERROR", "Invalid Inputs", "Please check inputs and try again.")
		return
	}

	reTrust.fulfillment(side, them, reference, balance, handleFulfill);
}
function handleFulfill(resp){
	if (resp){
		if (typeof resp == "string" && resp.startsWith("Error")){
			showModalCard("ERROR", "Unable To submit Fulfill Agreement", resp);
			return;
		}
		disableFulfill();
		disableRelease();
		startRefreshTimeout(resp, {section: "#fulfillStatusSection", hash: "#fulfillhash", status: "#fulfillstatus", successCB: fulfillSuccess});
	}
	console.log(resp);
}
function fulfillSuccess(resp){
	updateDetails();
	setVal("#balance", "")
	//enableFulfill()
}
function disableRelease(){
	disable("input[name=percentage]");
	disable("#releaseAgreement");
}
function enableRelease(){
	enable("input[name=percentage]");
	enable("#releaseAgreement");
}
function releaseClick(){
	commonTasks();	
	var side = $("#selectedSide").val();
	var them = $("#themreadonly").val();
	var reference = $("#refreadonly").val();
	var percentage = $('#percentage').val();

	// sanity check
	if (!side || !them || !reference || isNaN(percentage)){
		showModalCard("ERROR", "Invalid Inputs", "Please check inputs and try again.")
		return
	}

	reTrust.mutualRelease(side, them, reference, percentage, handleRelease);
}
function handleRelease(resp){
	if (resp){
		if (typeof resp == "string" && resp.startsWith("Error")){
			showModalCard("ERROR", "Unable To submit Release", resp);
			return;
		}

		disableFulfill();
		disableRelease();
		startRefreshTimeout(resp, {section: "#releaseStatusSection", hash: "#releasehash", status: "#releasestatus", successCB: releaseSuccess});
	}
	console.log(resp);
}
function releaseSuccess(resp){
	updateDetails();
	setVal("#percentage", "")
	//enableRelease();
}

function getAgreementDetailsArray(agt, ourside){

	var details = [];

	if (!agt){
		details.push("An agreement has not been initiated.");
		return details;
	}
	if (!ourside || (ourside != BUYER && ourside != SELLER)){
		details.push("An invalid side to an agreement has been specified.");
		return details;
	}

	var theirside = "", ouraddr = "", theiraddr = "", weinitiated = false, theyinitiated = false;
	var ourdeposit = 0, ourexpectation = 0, theirdeposit = 0, theirexpection = 0;
	var ourpct = 0, theirpct = 0;

	if (ourside == BUYER){
		theirside = SELLER;
		ouraddr = agt.buyer;
		theiraddr = agt.seller;
		if (agt.buyerStatus){
			weinitiated = true;
		}
		if (agt.sellerStatus){
			theyinitiated = true;
		}
		ourdeposit = agt.buyerDepositReceived;
		ourexpectation = agt.sellerDepositExpected;
		theirdeposit = agt.sellerDepositReceived;
		theirexpectation = agt.buyerDepositExpected;

		ourpct = agt.buyerReleasePct;
		theirpct = agt.sellerReleasePct;
	}
	else{
		theirside = BUYER;
		ouraddr = agt.seller;
		theiraddr = agt.buyer;
		if (agt.sellerStatus){
			weinitiated = true;
		}
		if (agt.buyerStatus){
			theyinitiated = true;
		}
		ourdeposit = agt.sellerDepositReceived;
		ourexpectation = agt.buyerDepositExpected;
		theirdeposit = agt.buyerDepositReceived;
		theirexpectation = agt.sellerDepositExpected;

		ourpct = agt.sellerReleasePct;
		theirpct = agt.buyerReleasePct;
	}

	var status = reTrust.agreementStatus(agt);
	var ourstatus = ourside == BUYER ? agt.buyerStatus : agt.sellerStatus;
	var theirstatus = ourside == BUYER ? agt.sellerStatus : agt.buyerStatus;

	var ourlink = window.location.protocol + "//" + window.location.host + window.location.pathname + "?ref=" + theiraddr + "-" + agt.reference;
	var theirlink = window.location.protocol + "//" + window.location.host + window.location.pathname + "?ref=" + ouraddr + "-" + agt.reference;

	/*
	var ourlink = "https://nebulas.rocks/reTrust?ref=" + theiraddr + "-" + agt.reference;
	var theirlink = "https://nebulas.rocks/reTrust?ref=" + ouraddr + "-" + agt.reference;
	*/

	details.push("You are the <strong>" + ourside + "</strong> in this agreement.");
	details.push("Your Nebulas address is: <strong>" + ouraddr + "</strong>");
	details.push("The " + theirside + "'s Nebulas address is: <strong>" + theiraddr + "</strong>");
	details.push("The agreement reference is: <strong>" + agt.reference + "</strong>");

	if (status != STATUS_FULFILLCOMPLETED && status != STATUS_RELEASECOMPLETED){

		details.push("<strong>You have " + (weinitiated ? "" : "not") + " initiated</strong> the agreement." + " The <strong>" + theirside + " has " + (theyinitiated ? (weinitiated ? "also" : "") : "not") + "</strong> initiated.");
		
		details.push("The " + theirside + " should use this link to deal with the agreement: <br/><small><a href='" + theirlink + "' target='_blank'><strong>" + theirlink + "</strong></a></small>");
		details.push("You should use this link instead: <br/><small><a href='" + ourlink + "' target='_blank'><strong>" + ourlink + "</strong></a></small>");

		details.push("You have deposited: <strong>" + new BigNumber(ourdeposit).div(NAS_FACTOR) + " NAS</strong>. " + (theyinitiated ? "You are expected to deposit: <strong>" + new BigNumber(theirexpectation).div(NAS_FACTOR) + " NAS</strong>." : ""));
		details.push((theyinitiated ? "The " + theirside + " has deposited: <strong>" + new BigNumber(theirdeposit).div(NAS_FACTOR) + " NAS</strong>. " : "") + "You expect the " + theirside + " to deposit: <strong>" + new BigNumber(ourexpectation).div(NAS_FACTOR) + " NAS</strong>.");
	}

	details.push("The agreement status is currently: <strong class='text-primary'>" + status + "</strong>");

	/*
	details.push((ourside == BUYER ? "You" : "The " + otherside) + " transferred a balance of: " + new BigNumber(agt.balanceReceived).div(NAS_FACTOR) + " NAS");
	details.push("The expected balance is: " + agt.balanceExpected);
	*/

	if (status == STATUS_INVALID){
		details.push("Since the agreement is still " + STATUS_INVALID + ", you can reclaim your entire deposit (or add more deposit).")
	}
	else if (status == STATUS_VALID){
		details.push("The agreement can be fulfilled or mutually released if both parties agree to the same.")
		
		if (ourstatus == STATUS_FULFILLSUBMITTED){
			details.push("You want to fulfill the agreement.");

			if (ourside == BUYER){
				details.push("You sent a balance of: " + new BigNumber(agt.balanceReceived).div(NAS_FACTOR) + " NAS.");
			}
			else{
				details.push("You expect a balance of: " + new BigNumber(agt.balanceExpected).div(NAS_FACTOR) + " NAS from the " + theirside + ".");				
			}
		}
		else if (ourstatus == STATUS_RELEASESUBMITTED){
			details.push("You want to mutually release the agreement and you want the deposits released as follows.");
			if (ourpct == 0){
				details.push("You don't want back any of your deposit and agree the " + theirside + " will get your entire deposit plus their entire deposit.");
			}
			else if (ourpct < 100){
				details.push("You want back " + ourpct + "% of your deposit. You agree the " + theirside + " will get back their entire deposit plus " + (100 - ourpct) + "% of your deposit.");
			}
			else if (ourpct == 100){
				details.push("You want all your deposit back and you agree the " + theirside + " will get all their deposit back also.");
			}
			else if (ourpct > 100 && ourpct < 200){
				details.push("You want back your entire deposit plus " + (ourpct - 100) + "% of the " + theirside + "'s deposit. You agree the " + theirside + " will get " + (200-ourpct) + "% of their deposit back.");
			}
			else {
				details.push("You want back your entire deposit plus the " + theirside + "'s entire depost.")
			}

		}

		if (theirstatus == STATUS_FULFILLSUBMITTED){
			details.push("The " + theirside + " wants to fulfill the agreement.");

			if (ourside == SELLER){
				details.push("The " + theirside + " sent a balance of: " + new BigNumber(agt.balanceReceived).div(NAS_FACTOR) + " NAS.");
			}
			else{
				details.push("The " + theirside + " expects a balance of: " + new BigNumber(agt.balanceExpected).div(NAS_FACTOR) + " NAS from you.");				
			}
		}
		else if (theirstatus == STATUS_RELEASESUBMITTED){
			details.push("The " + theirside + " wants to mutually release the agreement and wants the deposits as follows.");

			if (theirpct == 0){
				details.push("The " + theirside + " does not want back any of their deposit and agree you will get back your entire deposit plus their entire deposit.");
			}
			else if (theirpct < 100){
				details.push("The " + theirside + " wants back " + theirpct + "% of their deposit and agree you will get back your entire deposit plus " + (100 - ourpct) + "% of their deposit.");
			}
			else if (theirpct == 100){
				details.push("The " + theirside + " wants their entire deposit back and agree you will get your entire deposit back also.");
			}
			else if (theirpct > 100 && theirpct < 200){
				details.push("The " + theirside + " wants back their entire deposit plus " + (theirpct - 100) + "% of your deposit and agree you will get " + (200-ourpct) + "% of your deposit back.");
			}
			else {
				details.push("The " + theirside + " wants back their entire deposit plus your entire deposit.")
			}			
		}
	}
	
	return details;

}

function startRefreshTimeout(resp, userObj){
	if (userObj){
		setHtml(userObj.hash, "<small>TX Hash: " + resp.txhash + "</small>");
		setHtml(userObj.status, "<small class='text-warning'>PENDING: please wait...</small>");
		showSection(userObj.section);	
	}
	txRefreshCount = 0;
	refreshTimeout(userObj);
}
function refreshTimeout(userObj){
	txRefreshCount++;
	setTimeout(function(){ 
		reTrust.refresh(userObj, refreshStatusSuccess, refreshStatusError);
	}, 15000);
}
function refreshStatusSuccess(userObj, resp){
	if (resp){
		var obj = JSON.parse(resp);
		if (obj && obj.msg){
			if (obj.msg == "success"){

				if (userObj){
					setHtml(userObj.status, "<small class='text-success'>SUCCESS</small>");

					if (userObj.successCB){
						userObj.successCB(resp);
					}
				}
			}
			else {
				if (userObj){
					setHtml(userObj.status, "<small class='text-warning'>" + obj.msg + " (" + txRefreshCount + ")</small>");
				}
				refreshTimeout(userObj);
			}	
		}
		else{
			if (userObj){
				setHtml(userObj.status, "<small class='text-warning'>PENDING: please wait...(" + txRefreshCount + ")</small>");
			}
			refreshTimeout(userObj);
		}
	}
	else {
		if (userObj){
			setHtml(userObj.status, "<small class='text-warning'>PENDING: please wait...(" + txRefreshCount + ")</small>");
		}
		refreshTimeout(userObj);
	}
	console.log(resp);
}
function refreshStatusError(userObj, err){
	if (userObj){
		setHtml(userObj.status, err);
	}

	console.log(err);
}


// From: http://jquery-howto.blogspot.com/2009/09/get-url-parameters-values-with-jquery.html
function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}