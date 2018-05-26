"use strict";

const TESTNET = "Testnet";
const MAINNET = "Mainnet";
const DEFAULT_NEBNET = MAINNET;
//const DEFAULT_NEBNET = TESTNET;

const CONTRACTADDR_TESTNET = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const CONTRACTADDR_MAINNET = "n22d3Z78pHtcH59kTH12EYY2PLHvoDro27A";

const RPC_TESTNET = "https://testnet.nebulas.io";
const RPC_MAINNET = "https://mainnet.nebulas.io";

var nebulas = require("nebulas");
var NebPay = require("nebpay");

const NAS_FACTOR = "1e18";

const STATUS_INVALID = "invalid";
const STATUS_VALID = "valid";

const STATUS_ACTIVE = "active";

const STATUS_FULFILLSUBMITTED = "fulfill submitted";
const STATUS_FULFILLCOMPLETED = "fulfill completed";
const STATUS_RELEASESUBMITTED = "release submitted";
const STATUS_RELEASECOMPLETED = "release completed";

const BUYER = "buyer";
const SELLER = "seller";

var reTrustClient = function () {
	this.neb = new nebulas.Neb();
	this.nebPay = new NebPay();
	this.serialNumber = "";
	//this.callbackUrl = NebPay.config.mainnetUrl;
	this.nebNetwork = DEFAULT_NEBNET;
	this.callbackUrl = DEFAULT_NEBNET == TESTNET ? NebPay.config.testnetUrl : NebPay.config.mainnetUrl ;
	this.contractAddr = DEFAULT_NEBNET == TESTNET ? CONTRACTADDR_TESTNET : CONTRACTADDR_MAINNET;
	this.neb.setRequest(new nebulas.HttpRequest(DEFAULT_NEBNET == TESTNET ? RPC_TESTNET : RPC_MAINNET));
	console.log(DEFAULT_NEBNET + " selected: " + this.callbackUrl)

	this.foundAgts = null;
};

reTrustClient.prototype = {
	selectMainnet: function () {
		this.nebNetwork = MAINNET;
		this.callbackUrl = NebPay.config.mainnetUrl;
		this.contractAddr = CONTRACTADDR_MAINNET;
		this.neb.setRequest(new nebulas.HttpRequest(RPC_MAINNET));
		console.log("Mainnet selected: " + this.callbackUrl)
	},
	selectTestnet: function () {
		this.nebNetwork = TESTNET;
		this.callbackUrl = NebPay.config.testnetUrl;
		this.contractAddr = CONTRACTADDR_TESTNET;
		this.neb.setRequest(new nebulas.HttpRequest(RPC_TESTNET));
		console.log("Testnet selected: " + this.callbackUrl)
	},

	agreementStatus: function(agreement){
        if (agreement) {
            if (agreement.buyerStatus == STATUS_FULFILLSUBMITTED && agreement.sellerStatus == STATUS_FULFILLSUBMITTED) {
                return STATUS_FULFILLSUBMITTED;
            }
            else if (agreement.buyerStatus == STATUS_FULFILLCOMPLETED && agreement.sellerStatus == STATUS_FULFILLCOMPLETED) {
                return STATUS_FULFILLCOMPLETED;
            }
            else if (agreement.buyerStatus == STATUS_RELEASESUBMITTED && agreement.sellerStatus == STATUS_RELEASESUBMITTED) {
                return STATUS_RELEASESUBMITTED;
            }
            else if (agreement.buyerStatus == STATUS_RELEASECOMPLETED && agreement.sellerStatus == STATUS_RELEASECOMPLETED) {
                return STATUS_RELEASECOMPLETED;
            }
            else if (agreement.buyerStatus != "" && agreement.sellerStatus != ""
                && new BigNumber(agreement.buyerDepositReceived).gte(agreement.buyerDepositExpected)
                && new BigNumber(agreement.sellerDepositReceived).gte(agreement.sellerDepositExpected)) {
                return STATUS_VALID;
            }
            else {
                return STATUS_INVALID;
            }
        }
        else {
            return STATUS_INVALID;
        }
	},

    findAgreement: function(them, reference, callback, showqr=false){
		var args = [them, reference];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "findAgreement";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.simulateCall(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "findAgreement",
				desc: "reTrust.findAgreement"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._findAgreementListener : callback //set listener for extension transaction result
		});
	},
	_findAgreementListener: function(resp){
		console.log("_findAgreementListener.resp: " + JSON.stringify(resp));
		//reTrust.refresh();
	},

	getAgreement: function (side, them, reference, callback, showqr=false)  {

		if (side == BUYER){
			this.getAgreementPerBuyer(them, reference, callback, showqr);
		}
		else if (side == SELLER){
			this.getAgreementPerSeller(them, reference, callback, showqr);
		}

		/*
		var args = [side, them, reference];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "getAgreement";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.simulateCall(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "getAgreement",
				desc: "reTrust.getAgreement"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._getAgreementListenser : callback  //set listener for extension transaction result
		});
		*/

	},
	getAgreementPerBuyer: function(resp){
		console.log("getAgreementPerBuyer.resp: " + JSON.stringify(resp));
		//reTrust.refresh();
	},
	
	getAgreementPerBuyer: function (seller, reference, callback, showqr=false)  {
		var args = [seller, reference];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "getAgreementPerBuyer";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.simulateCall(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "getAgreementPerBuyer",
				desc: "reTrust.getAgreementPerBuyer"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._getAgreementPerBuyerListenser : callback  //set listener for extension transaction result
		});

	},
	_getAgreementPerBuyerListenser: function(resp){
		console.log("getAgreementPerBuyer.resp: " + JSON.stringify(resp));
		//reTrust.refresh();
	},
	getAgreementPerSeller: function (buyer, reference, callback, showqr=false)  {
		var args = [buyer, reference];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "getAgreementPerSeller";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.simulateCall(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "getAgreementPerSeller",
				desc: "reTrust.getAgreementPerSeller"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._getAgreementPerSellerListenser : callback  //set listener for extension transaction result
		});
	},
	_getAgreementPerSellerListenser: function(resp){
		console.log("_getAgreementPerSellerListenser.resp: " + JSON.stringify(resp));
		//reTrust.refresh();
	},
	

    initiateAgreement: function(side, them, reference, deposit, expectation, callback, showqr=false){
		var args = [side, them, reference, expectation];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = deposit;
		var callFunction = "initiateAgreement";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.call(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "initiateAgreement",
				desc: "reTrust.initiateAgreement"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._initiateAgreementListenser : callback  //set listener for extension transaction result
		});

	},
	_initiateAgreementListenser: function(resp){
		console.log("_initiateAgreementListenser.resp: " + JSON.stringify(resp));
		reTrust.refresh();
	},
    addDeposit: function (side, them, reference, deposit, callback, showqr=false) {
		var args = [side, them, reference];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = deposit;
		var callFunction = "addDeposit";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.call(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "addDeposit",
				desc: "reTrust.addDeposit"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._addDepositListenser : callback  //set listener for extension transaction result
		});

	},
	_addDepositListenser: function(resp){
		console.log("_addDepositListenser.resp: " + JSON.stringify(resp));
		reTrust.refresh();
	},

    reclaimExcessDeposit: function (side, them, reference, callback, showqr=false) {
		var args = [side, them, reference];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "reclaimExcessDeposit";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.call(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "reclaimExcessDeposit",
				desc: "reTrust.reclaimExcessDeposit"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._reclaimExcessDepositListenser : callback  //set listener for extension transaction result
		});

	},
	_reclaimExcessDepositListenser: function(resp){
		console.log("_reclaimExcessDepositListenser.resp: " + JSON.stringify(resp));
		reTrust.refresh();
	},

	fulfillment: function (side, them, reference, balance, callback, showqr=false) {
		var args = (side == BUYER) ? [side, them, reference] : [side, them, reference, balance, showqr=false];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = (side == BUYER) ? balance : 0;
		var callFunction = "fulfillment";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.call(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "fulfillment",
				desc: "reTrust.fulfillment"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._fulfillmentListenser : callback  //set listener for extension transaction result
		});

	},
	_fulfillmentListenser: function(resp){
		console.log("_fulfillmentListenser.resp: " + JSON.stringify(resp));
		reTrust.refresh();
	},

	reclaimExcessBalancePerBuyer: function (seller, reference, callback, showqr=false) {
		var args = [seller, reference];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "reclaimExcessBalancePerBuyer";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.call(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "reclaimExcessBalancePerBuyer",
				desc: "reTrust.reclaimExcessBalancePerBuyer"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._reclaimExcessBalancePerBuyerListenser : callback  //set listener for extension transaction result
		});

	},
	_reclaimExcessBalancePerBuyerListenser: function(resp){
		console.log("_reclaimExcessBalancePerBuyerListenser.resp: " + JSON.stringify(resp));
		reTrust.refresh();
	},	

	mutualRelease: function (side, them, reference, percentage, callback, showqr=false)  {
		var args = [side, them, reference, percentage];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "mutualRelease";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.call(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "mutualRelease",
				desc: "reTrust.mutualRelease"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._mutualReleaseListenser : callback  //set listener for extension transaction result
		});

	},
	_mutualRelease: function(resp){
		console.log("_mutualRelease.resp: " + JSON.stringify(resp));
		reTrust.refresh();
	},

	echo: function(echoText, callback, showqr=false){

		var args = [echoText];
		var argsText = JSON.stringify(args);

		var to = this.contractAddr;
		var value = 0;
		var callFunction = "echo";
		var callArgs = argsText;
		this.serialNumber = this.nebPay.simulateCall(to, value, callFunction, callArgs, {
			qrcode: {
				showQRCode: showqr
			},
			goods: {
				name: "echo",
				desc: "reTrust.echo"
			},
			callback: this.callbackUrl,
			listener: !callback ? this._echoListenser : callback //set listener for extension transaction result
		});
	},
	_echoListenser: function(resp){
		console.log("_echoListenser.resp: " + JSON.stringify(resp));
		//reTrust.refresh();
	},

	refresh: function(userObj, successCB, errorCB){
		this.nebPay.queryPayInfo(this.serialNumber,{callback: this.callbackUrl})   //search transaction result from server (result upload to server by app)
		.then(function (resp) {
			if (successCB){
				successCB(userObj, resp);
			}
			console.log("refresh.resp: " + JSON.stringify(resp))
		})
		.catch(function (err) {
			if (errorCB){
				errorCB(userObj, err);
			}
			console.log("error:" + err);
		});
	}

};

var reTrust = new reTrustClient();
