// John Tran, johntran@eightdawns.com - May 15, 2018

"use strict";

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

var AgreementDetails = function (text) {
    if (text) {
        var obj = JSON.parse(text);

        this.key = obj.key;
        this.reference = obj.reference;
        this.buyer = obj.buyer;
        this.seller = obj.seller;
        this.buyerStatus = obj.buyerStatus;
        this.sellerStatus = obj.sellerStatus;
        this.buyerDepositReceived = obj.buyerDepositReceived;
        this.buyerDepositExpected = obj.buyerDepositExpected;
        this.sellerDepositReceived = obj.sellerDepositReceived;
        this.sellerDepositExpected = obj.sellerDepositExpected;
        this.balanceReceived = obj.balanceReceived;
        this.balanceExpected = obj.balanceExpected;
        this.buyerReleasePct = obj.buyerReleasePct;
        this.sellerReleasePct = obj.sellerReleasePct;
        this.buyerFees = obj.buyerFees;
        this.sellerFees = obj.sellerFees;
        this.totalFees = obj.totalFees;

    } else {

        this.key = "";
        this.reference = "";
        this.buyer = "";
        this.seller = "";
        this.buyerStatus = "";
        this.sellerStatus = "";
        this.buyerDepositReceived = new BigNumber(0);      // in GWei
        this.buyerDepositExpected = new BigNumber(0);      // in GWei
        this.sellerDepositReceived = new BigNumber(0);     // in GWei
        this.sellerDepositExpected = new BigNumber(0);     // in GWei
        this.balanceReceived = new BigNumber(0);           // in GWei
        this.balanceExpected = new BigNumber(0);           // in GWei
        this.buyerReleasePct = new BigNumber(0);           // in GWei
        this.sellerReleasePct = new BigNumber(0);          // in GWei
        this.buyerFees = new BigNumber(0);                 // in GWei
        this.sellerFees = new BigNumber(0);                // in GWei
        this.totalFees = new BigNumber(0);                 // in GWei
    }
};

AgreementDetails.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var reTrustContract = function () {

    LocalContractStorage.defineMapProperty(this, "agreements", {
        parse: function (text) {
            return new AgreementDetails(text);
        },
        stringify: function (obj) {
            return obj.toString();
        }
    });
    LocalContractStorage.defineProperties(this, {
        ownerAccount: null,         // owner account for receiving transaction fees
        transactionFeePct: null,    // transaction fee percentage
        agreementCount: null,       // total number of agreements in total
        activeCount: null,          // number of active agreements
        fulfilledCount: null,       // number of fulfilled agreements
        releasedCount: null,        // number of released agreements
        totalPayout: null,          // total fees in NAS collected by owner account
        buyerPayout: null,          // buyer fees in NAS collected by owner account
        sellerPayout: null,         // seller fees in NAS collected by owner account
        totalFees: null,            // total fees in NAS collected by owner account
        buyerFees: null,            // buyer fees in NAS collected by owner account
        sellerFees: null,           // seller fees in NAS collected by owner account
    });
};
reTrustContract.prototype = {
    init: function (transactionFeePct) {
        this.ownerAccount = Blockchain.transaction.from;
        this.transactionFeePct = new BigNumber(transactionFeePct).div(100);
        this.agreementCount = new BigNumber(0);
        this.activeCount = new BigNumber(0);
        this.fulfilledCount = new BigNumber(0);
        this.releasedCount = new BigNumber(0);
        this.totalPayout = new BigNumber(0);
        this.buyerPayout = new BigNumber(0);
        this.sellerPayout = new BigNumber(0);
        this.totalFees = new BigNumber(0);
        this.buyerFees = new BigNumber(0);
        this.sellerFees = new BigNumber(0);
    },

    findAgreement: function(them, reference){

        var ret = {
            found: false,
            buyAgt: null,
            sellAgt: null,
            error: ""
        }

        if (!Blockchain.verifyAddress(them)) {
            ret.error =  "invalid other party address";
            return ret;
        }
        if (Blockchain.transaction.from == them){
            ret.error =  "same buyer and seller address";
            return ret;            
        }

        reference = reference.trim();
        var buyKey = Blockchain.transaction.from + them + reference;
        var sellKey = them + Blockchain.transaction.from + reference;

        ret.buyAgt = this.agreements.get(buyKey);
        ret.sellAgt = this.agreements.get(sellKey);

        if (ret.buyAgt || ret.sellAgt) {
            ret.found = true;
        }
        return ret;
    },

    // public method: get agreement status on buyer side
    // arguments:
    // - seller:          Nebulas address of seller
    // - reference:       A reference string for this agreement between buyer and seller
    // value: denied
    getAgreementStatusPerBuyer: function (seller, reference) {
        return this.getAgreementStatus(BUYER, seller, reference);
    },
    // public method: get agreement status on seller side
    // arguments:
    // - buyer:           Nebulas address of buyer
    // - reference:       A reference string for this agreement between buyer and seller
    // value: denied
    getAgreementStatusPerSeller: function (buyer, reference) {
        return this.getAgreementStatus(SELLER, buyer, reference);
    },

    // public method: get agreement status
    // arguments:
    // - side:            Which side: buyer or seller
    // - them:            Nebulas address of other side
    // - reference:       A reference string for this agreement between buyer and seller
    // value: denied
    getAgreementStatus: function (side, them, reference) {

        this._denyValue();

        if (side != BUYER && side != SELLER){
            throw new Error("invalid party specification");            
        }

        reference = reference.trim();

        var buyer = (side == BUYER ? Blockchain.transaction.from : them);
        var seller = (side == SELLER ? Blockchain.transaction.from : them);

        var key = buyer + seller + reference;
        var agreement = this.agreements.get(key);

        return this._agreementStatus(agreement);
    },
    // private method: agreement status given agreement
    // arguments:
    // - agreement:            the agreement
    _agreementStatus: function (agreement) {
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

    // public method: initiates a new agreement on buyer side
    // arguments:
    // - seller:          Nebulas address of seller
    // - reference:       A reference string for this agreement between buyer and seller
    // - expectation:     Buyer's expectation of seller's deposit (once set, cannot change)
    // value: added to buyer's deposit
    initiateAgreementPerBuyer: function (seller, reference, expectation) {
        this.initiateAgreement(BUYER, seller, reference, expectation);
    },

    // public method: initiates a new agreement on seller side
    // arguments:
    // - buyer:           Nebulas address of buyer
    // - reference:       A reference string for this agreement between buyer and seller
    // - expectation:     Seller's expectation of buyer's deposit (once set, cannot change)
    // value: added to seller's deposit
    initiateAgreementPerSeller: function (buyer, reference, expectation) {
        this.initiateAgreement(SELLER, buyer, reference, expectation);
    },

    // private method: creates a new agreement
    // arguments:
    // - side:            Which side: buyer or seller
    // - them:            Nebulas address of other side
    // - reference:       A reference string for this agreement between buyer and seller
    // - expectation:     Current side's expectation of other side's deposit (must be >= 0)
    // value: added to current side's deposit
    initiateAgreement: function (side, them, reference, expectation) {

        if (side != BUYER && side != SELLER){
            throw new Error("invalid party specification");            
        }
        if (!Blockchain.verifyAddress(them)) {
            throw new Error("invalid address for other party");
        }
        if (new BigNumber(expectation).isNaN()) {
            throw new Error("invalid expectation of other party's deposit");
        }

        reference = reference.trim();
        expectation = BigNumber.max(0, expectation);

        var buyer = (side == BUYER ? Blockchain.transaction.from : them);
        var seller = (side == SELLER ? Blockchain.transaction.from : them);

        if (buyer == seller){
            throw new Error("you are trying to initiate an agreement with yourself? LOL");            
        }

        var key = buyer + seller + reference;
        var agreement = this.agreements.get(key);

        if (!agreement) {
            // agreement does not exist yet
            agreement = new AgreementDetails();
            agreement.key = key;
            agreement.reference = reference;
            agreement.buyer = buyer;
            agreement.seller = seller;
            this.agreements.put(key, agreement);

            this.agreementCount = new BigNumber(this.agreementCount).plus(1);
            this.activeCount = new BigNumber(this.activeCount).plus(1);
        }
        else {
            // if an agreement exists and both parties have initiated, stop
            if (agreement.buyerStatus != "" && agreement.sellerStatus != "") {
                throw new Error("both parites have initiated the agreement");
            }

            this._denyIfFulfilledOrReleased(agreement);
        
        }

        // if we get here, one or both sides have not initiated the agreement yet
        if (side == BUYER) {
            if (agreement.buyerStatus == "") {
                // buyer has not initiated yet
                agreement.buyerDepositReceived = Blockchain.transaction.value;
                agreement.sellerDepositExpected = expectation.times(NAS_FACTOR);
                agreement.buyerStatus = STATUS_ACTIVE;
                this.agreements.put(key, agreement);
            }
            else {
                throw new Error("you (buyer) already initiated the agreement");
            }
        }
        else if (side == SELLER) {
            if (agreement.sellerStatus == "") {
                // seller has not initiated
                agreement.sellerDepositReceived = Blockchain.transaction.value;
                agreement.buyerDepositExpected = expectation.times(NAS_FACTOR);
                agreement.sellerStatus = STATUS_ACTIVE;
                this.agreements.put(key, agreement);
            }
            else {
                throw new Error("you (seller) already initiated the agreement");
            }
        }
        else {
            // agreement exists
            throw new Error("oops something messed up");
        }

    },

    // public method: add deposit on buyer side
    // arguments:
    // - seller:          Nebulas address of seller
    // - reference:       A reference string for this agreement between buyer and seller
    // value: added to buyer's deposit
    addDepositPerBuyer: function (seller, reference) {
        this.addDeposit(BUYER, seller, reference);
    },

    // public method: add deposit on seller side
    // arguments:
    // - buyer:           Nebulas address of buyer
    // - reference:       A reference string for this agreement between buyer and seller
    // value: added to seller's deposit
    addDepositPerSeller: function (buyer, reference) {
        this.addDeposit(SELLER, buyer, reference);
    },


    // private method: add deposit
    // arguments:
    // - side:            Which side: buyer or seller
    // - them:            Nebulas address of other side
    // value: added to current side's deposit
    addDeposit: function (side, them, reference) {

        if (side != BUYER && side != SELLER){
            throw new Error("invalid party specification");            
        }

        if (!Blockchain.verifyAddress(them)) {
            throw new Error("invalid address for other party");
        }

        reference = reference.trim();

        var buyer = (side == BUYER ? Blockchain.transaction.from : them);
        var seller = (side == SELLER ? Blockchain.transaction.from : them);

        var key = buyer + seller + reference;
        var agreement = this.agreements.get(key);

        if (!agreement) {
            // agreement does not exists
            throw new Error("agreement does not exists");
        }
        else {

            this._denyIfFulfilledOrReleased(agreement);
        
            if (side == BUYER && agreement.buyer == buyer) {
                if (agreement.buyerStatus == "") {
                    throw new Error("must initiate the agreement before adding more deposits");
                }
                else {
                    // add additional deposit received
                    agreement.buyerDepositReceived = new BigNumber(agreement.buyerDepositReceived).plus(Blockchain.transaction.value);
                    this.agreements.put(key, agreement);
                }

            }
            else if (side == SELLER && agreement.seller == seller) {
                if (agreement.sellerStatus == "") {
                    throw new Error("must initiate the agreement before adding more deposits");
                }
                else {
                    // add additional deposit expected
                    agreement.sellerDepositReceived = new BigNumber(agreement.sellerDepositReceived).plus(Blockchain.transaction.value);
                    this.agreements.put(key, agreement);
                }
            }
            else {
                // sanity check - something really messed up
                throw new Error("oops something messed up");
            }
        }
    },
    // public method: reclaim excess deposit on buyer side
    // arguments:
    // - seller:          Nebulas address of buyer
    // - reference:       A reference string for this agreement between buyer and seller
    // value: denied
    // description:
    // buyer can unilaterally reclaim any portion of deposit not expected by seller or in an invalid contract
    // - transaction might have been uninitiated by seller
    // - buyer might have added more deposit than seller expected
    reclaimExcessDepositPerBuyer: function (seller, reference) {
        this.reclaimExcessDeposit(BUYER, seller, reference);
    },


    // public method: reclaim excess deposit on seller side
    // arguments:
    // - buyer:           Nebulas address of buyer
    // - reference:       A reference string for this agreement between buyer and seller
    // value: denied
    // description:
    // buyer can unilaterally reclaim any portion of deposit not expected by seller
    // - transaction might have been uninitiated by seller
    // - buyer might have added more deposit than seller expected
    // seller can unilaterally reclaim any portion of seller deposit not expected by buyer or in an invalid contract
    // - transaction might have been uninitiated by buyer
    // - seller might have added more deposit than buyer expected
    reclaimExcessDepositPerSeller: function (buyer, reference) {
        this.reclaimExcessDeposit(SELLER, buyer, reference);
    },

    // private method: reclaim excess deposit
    // arguments:
    // - side:            Which side: buyer or seller
    // - them:            Nebulas address of other side
    // value: denied
    reclaimExcessDeposit: function (side, them, reference) {

        this._denyValue();

        if (side != BUYER && side != SELLER){
            throw new Error("invalid party specification");            
        }
        if (!Blockchain.verifyAddress(them)) {
            throw new Error("invalid address for other party");
        }

        reference = reference.trim();

        var buyer = (side == BUYER ? Blockchain.transaction.from : them);
        var seller = (side == SELLER ? Blockchain.transaction.from : them);

        var key = buyer + seller + reference;
        var agreement = this.agreements.get(key);

        var reclaimable = new BigNumber(0);

        if (!agreement) {
            throw new Error("agreement does not exist");
        }
        else {
            // agreement exists
            if (side == BUYER && agreement.buyer == buyer) {

                if (this._agreementStatus(agreement) == STATUS_VALID) {
                    // if agreement is valid can reclaim excess deposit
                    reclaimable = new BigNumber(agreement.buyerDepositReceived).minus(agreement.buyerDepositExpected);
                }
                else if (this._agreementStatus(agreement) == STATUS_INVALID) {
                    // if agreement is invalid can reclaim entire deposit
                    reclaimable = new BigNumber(agreement.buyerDepositReceived);
                }

                if (reclaimable.lte(0) || reclaimable.gt(agreement.buyerDepositReceived)) {
                    // reclaimable amount cannot be <= 0 or > deposit received
                    throw new Error("no reclaimable buyer deposit");
                }

                // transfer reclaimable deposit to buyer
                var result = Blockchain.transfer(buyer, reclaimable);
                if (!result) {
                    throw new Error("failed to transfer reclaimed deposit to buyer");
                }

                // if transfer succeeded, reduce deposit received
                agreement.buyerDepositReceived = new BigNumber(agreement.buyerDepositReceived).minus(reclaimable);
                this.agreements.put(key, agreement);
            }
            else if (side == SELLER && agreement.seller == seller) {

                if (this._agreementStatus(agreement) == STATUS_VALID) {
                    // if agreement is valid can reclaim excess deposit
                    reclaimable = new BigNumber(agreement.sellerDepositReceived).minus(agreement.sellerDepositExpected);
                }
                else if (this._agreementStatus(agreement) == STATUS_INVALID) {
                    // if agreement is invalid can reclaim entire deposit
                    reclaimable = new BigNumber(agreement.sellerDepositReceived);
                }

                if (reclaimable.lte(0) || reclaimable.gt(agreement.sellerDepositReceived)) {
                    // reclaimable amount cannot be <= 0 or > deposit received
                    throw new Error("no reclaimable seller deposit");
                }

                // transfer reclaimable deposit to seller
                var result = Blockchain.transfer(seller, reclaimable);
                if (!result) {
                    throw new Error("failed to transfer reclaimed deposit to seller");
                }

                // if transfer succeeded, reduce deposit received
                agreement.sellerDepositReceived = new BigNumber(agreement.sellerDepositReceived).minus(reclaimable);
                this.agreements.put(key, agreement);
            }
            else {
                // sanity check - something really messed up
                throw new Error("oops something messed up");
            }
        }
    },
    
    // buyer and seller fulfill agreement
    // - both sides must initiate
    // - balance sent by buyer must equal expected balance expected by seller
    // - buyer and seller deposits must also match each other's expected amounts

    // buyer side - send agreed to balance to contract
    fulfillment: function (side, them, reference, expectation) {
        if (side == BUYER){
            this.fulfillmentPerBuyer(them, reference);
        }
        else if (side == SELLER){
            this.fulfillmentPerSeller(them, reference, expectation);
        }
        else{
            throw new Error("invalid party specification");            
        }
    },

    // buyer and seller fulfill agreement
    // - both sides must initiate
    // - balance sent by buyer must equal expected balance expected by seller
    // - buyer and seller deposits must also match each other's expected amounts

    // buyer side - send agreed to balance to contract
    fulfillmentPerBuyer: function (seller, reference) {

        var result = Blockchain.verifyAddress(seller);
        if (!result) {
            throw new Error("invalid seller address");
        }

        reference = reference.trim();
        seller = seller.trim();
        var buyer = Blockchain.transaction.from;

        var key = buyer + seller + reference;
        key = key.trim();
        var agreement = this.agreements.get(key);

        if (!agreement) {
            throw new Error("agreement does not exist: " + key);
        }
        else {
            // agreement exists
            if (agreement.buyer == buyer) {

                this._denyIfFulfilledOrReleased(agreement);

                // add transaction value to balance received
                agreement.balanceReceived = new BigNumber(agreement.balanceReceived).plus(Blockchain.transaction.value);
                agreement.buyerStatus = STATUS_FULFILLSUBMITTED;
                this.agreements.put(key, agreement);

                // seller also indicated agreement as fulfilled
                if (agreement.sellerStatus === STATUS_FULFILLSUBMITTED
                    && new BigNumber(agreement.balanceReceived).gte(agreement.balanceExpected)) {

                    // handle fulfillment of funds (additional checks inside function)
                    this._fulfillFunds(agreement);
                }
            }
            else {
                // sanity check - something really messed up
                throw new Error("wrong buyer: " + buyer + ", expected: " + agreement.buyer);
            }
        }
    },

    // seller side - submits expected balance as a function argument
    // even though it is not expected, any value sent will be added to seller's deposit
    fulfillmentPerSeller: function (buyer, reference, expectation) {

        // seller should not send value
        this._denyValue();

        var result = Blockchain.verifyAddress(buyer);
        if (!result) {
            throw new Error("invalid buyer address");
        }
        if (new BigNumber(expectation).isNaN()) {
            throw new Error("invalid expected balance");
        }

        reference = reference.trim();
        buyer = buyer.trim();
        var seller = Blockchain.transaction.from;
        var balanceExpected = BigNumber.max(0, expectation).times(NAS_FACTOR);

        var key = buyer + seller + reference;
        key = key.trim();
        var agreement = this.agreements.get(key);

        if (!agreement) {
            throw new Error("agreement does not exist: " + key);
        }
        else {
            // agreement exists
            if (agreement.seller == seller) {

                this._denyIfFulfilledOrReleased(agreement);

                // add transaction value to balance received
                agreement.balanceExpected = new BigNumber(agreement.balanceExpected).plus(balanceExpected);
                agreement.sellerStatus = STATUS_FULFILLSUBMITTED;
                this.agreements.put(key, agreement);

                // buyer also indicated agreement as fulfilled
                if (agreement.buyerStatus === STATUS_FULFILLSUBMITTED
                    && new BigNumber(agreement.balanceReceived).gte(agreement.balanceExpected)) {

                    // handle fulfillment of funds (additional checks inside function)
                    this._fulfillFunds(agreement);
                }
            }
            else {
                // sanity check - something really messed up
                throw new Error("wrong seller: " + seller + ", expected: " + agreement.seller);
            }
        }
    },

    _fulfillFunds: function (agreement) {

        //  balance received & expected must equal       

        if (agreement.balanceReceived != agreement.balanceExpected) {
            throw new Error("received balance does not equal expected balance");
        }
        else if (agreement.buyerDepositReceived != agreement.buyerDepositExpected) {
            throw new Error("buyer's deposit does not match expected amount");
        }
        else if (agreement.sellerDepositReceived != agreement.sellerDepositExpected) {
            throw new Error("seller's deposit does not match expected amount");
        }
        else {

            // total funds received
            var total = new BigNumber(agreement.buyerDepositReceived).plus(agreement.sellerDepositReceived).plus(agreement.balanceReceived);
            // send total expected to seller
            var sellerTotal = new BigNumber(agreement.buyerDepositExpected).plus(agreement.sellerDepositReceived).plus(agreement.balanceExpected);
            // send excess back to buyer
            var buyerTotal = total.minus(sellerTotal);

            if (buyerTotal.gt(0)) {

                var buyerFee = new BigNumber(buyerTotal).times(this.transactionFeePct / 100);
                var buyerPayout = buyerTotal.minus(buyerFee);

                // put buyer payout into balance in case transfer fails
                // (buyer can always get balance back)
                agreement.balanceExpected = new BigNumber(0);
                agreement.buyerDepositReceived = new BigNumber(0);
                agreement.buyerDepositExpected = new BigNumber(0);
                agreement.buyerReleasePct = new BigNumber(0);
                this.agreements.put(agreement.key, agreement);

                if (!Blockchain.transfer(agreement.buyer, buyerPayout)) {
                    throw new Error("failed to transfer total to buyer");
                }

                this.totalPayout = new BigNumber(this.totalPayout).plus(buyerPayout.div(NAS_FACTOR));
                this.buyerPayout = new BigNumber(this.buyerPayout).plus(buyerPayout.div(NAS_FACTOR));

                agreement.balanceReceived = new BigNumber(0);
                agreement.buyerStatus = STATUS_FULFILLCOMPLETED;
                this.agreements.put(agreement.key, agreement);

                if (!Blockchain.transfer(this.ownerAccount, buyerFee)) {
                    throw new Error("failed to transfer fee to owner");
                }

                // update fees tally
                this.totalFees = new BigNumber(this.totalFees).plus(sellerFee.div(NAS_FACTOR));
                this.buyerFees = new BigNumber(this.buyerFees).plus(buyerFee.div(NAS_FACTOR));

                agreement.buyerFees = new BigNumber(agreement.buyerFees).plus(buyerFee);
                agreement.totalFees = new BigNumber(agreement.totalFees).plus(buyerFee);
                this.agreements.put(agreement.key, agreement);

            }
            else {
                agreement.balanceReceived = new BigNumber(0);
                agreement.buyerStatus = STATUS_FULFILLCOMPLETED;
                this.agreements.put(agreement.key, agreement);                
            }

            if (sellerTotal.gt(0)) {

                var sellerFee = new BigNumber(sellerTotal).times(this.transactionFeePct / 100);
                var sellerPayout = sellerTotal.minus(sellerFee);

                agreement.sellerDepositExpected = new BigNumber(0);
                this.agreements.put(agreement.key, agreement);

                if (!Blockchain.transfer(agreement.seller, sellerPayout)) {
                    throw new Error("failed to transfer total to seller");
                }

                this.totalPayout = new BigNumber(this.totalPayout).plus(sellerPayout.div(NAS_FACTOR));
                this.sellerPayout = new BigNumber(this.sellerPayout).plus(sellerPayout.div(NAS_FACTOR));

                agreement.sellerDepositReceived = new BigNumber(0);
                agreement.sellerStatus = STATUS_FULFILLCOMPLETED;
                this.agreements.put(agreement.key, agreement);

                if (!Blockchain.transfer(this.ownerAccount, sellerFee)) {
                    throw new Error("failed to transfer fee to owner");
                }

                // update fees tally
                this.totalFees = new BigNumber(this.totalFees).plus(sellerFee.div(NAS_FACTOR));
                this.sellerFees = new BigNumber(this.sellerFees).plus(sellerFee.div(NAS_FACTOR));

                agreement.sellerFees = new BigNumber(agreement.sellerFees).plus(sellerFee);
                agreement.totalFees = new BigNumber(agreement.totalFees).plus(sellerFee);
                this.agreements.put(agreement.key, agreement);

            }
            else{
                agreement.sellerDepositReceived = new BigNumber(0);
                agreement.sellerStatus = STATUS_FULFILLCOMPLETED;
                this.agreements.put(agreement.key, agreement);                
            }

            // update counts
            this.activeCount = new BigNumber(this.activeCount).minus(1);
            this.fulfilledCount = new BigNumber(this.fulfilledCount).plus(1);


        }

    },

    // buyer can unilaterally reclaim any portion of balance not expected by seller
    // - transaction might have not been fulfilled by seller
    // - buyer might have added more balance than seller expected
    // - buyer might have fulfilled again after fulfillment or release
    reclaimExcessBalancePerBuyer: function (seller, reference) {

        this._denyValue();

        if (!Blockchain.verifyAddress(seller)) {
            throw new Error("invalid seller address");
        }

        reference = reference.trim();
        seller = seller.trim();
        var buyer = Blockchain.transaction.from;

        var key = buyer + seller + reference;
        var agreement = this.agreements.get(key);

        if (!agreement) {
            throw new Error("agreement does not exist");
        }
        else {
            // agreement exists
            if (agreement.buyer == buyer) {

                var reclaimableBalance = new BigNumber(0);

                reclaimableBalance = new BigNumber(agreement.buyerBalanceReceived).minus(agreement.buyerBalanceExpected);

                if (reclaimableBalance.lte(0) || reclaimableBalance.gt(agreement.buyerBalanceReceived)) {
                    // reclaimable amount cannot be <= 0 or > balance received
                    throw new Error("invalid reclaimable balance");
                }

                // transfer reclaimable deposit to buyer
                var result = Blockchain.transfer(buyer, reclaimableBalance);
                if (!result) {
                    throw new Error("failed to transfer reclaimed balance to buyer");
                }

                // if transfer succeeded, reduce deposit received
                agreement.buyerBalanceReceived = new BigNumber(agreement.buyerBalanceReceived).minus(reclaimableBalance);
                this.agreements.put(key, agreement);
            }
            else {
                // sanity check - something really messed up
                throw new Error("wrong buyer: " + buyer + ", expected: " + agreement.buyer);
            }
        }

    },


    // buyer and seller mutual release agreement 
    // - both sides must initiate
    // - any balance received will be returned to the buyer
    // - deposits must match expected corresponding amounts
    // - deposits are returned based on agreed to percentages
    // - percentage must be in the range of 0 to 200
    // - buyer perecentages plus seller perecentage must equal 200
    // - handles dispute resolution whereby either the buyer or seller is at full or partial fault
    // - some or all of one party's deposit can be forfeited to the other party in order to release each other from the agreement
    // - if percentage is 0, buyer gets nothing back
    // - if percentage is 0 > and < 100, buyer gets some of buyer's deposit back but not all
    // - if percentage is > 100, buyer gets all buyer's deposit back PLUS some of seller's
    // - if percentage is 200, buyer gets both buyer's and seller's deposits back
    mutualRelease: function (side, them, reference, percentage) {
        if (side == BUYER){
            this.mutualReleasePerBuyer(them, reference, percentage);
        }
        else if (side == SELLER){
            this.mutualReleasePerSeller(them, reference, percentage);
        }
        else{
            throw new Error("invalid party specification");            
        }
    },
    
    // buyer side - indicate buyer's percentage of the deposit to return (if any)
    mutualReleasePerBuyer: function (seller, reference, percentage) {

        this._denyValue();

        if (!Blockchain.verifyAddress(seller)) {
            throw new Error("invalid seller address");
        }
        if (new BigNumber(percentage).isNaN()) {
            throw new Error("invalid percentage");
        }

        reference = reference.trim();
        seller = seller.trim();
        var buyer = Blockchain.transaction.from;
        var buyerPct = BigNumber.max(0, percentage);
        buyerPct = BigNumber.min(200, buyerPct);

        var key = buyer + seller + reference;
        var agreement = this.agreements.get(key);

        if (!agreement) {
            throw new Error("agreement does not exist: " + key);
        }
        else {
            // agreement exists
            if (agreement.buyer == buyer) {

                this._denyIfFulfilledOrReleased(agreement);
                
                // set buyer status to released
                agreement.buyerReleasePct = buyerPct;
                agreement.buyerStatus = STATUS_RELEASESUBMITTED;
                this.agreements.put(key, agreement);

                // seller also indicated agreement as released
                if (agreement.sellerStatus === STATUS_RELEASESUBMITTED) {

                    // handle release of funds (additional checks inside function)
                    this._releaseFunds(agreement);
                }
            }
            else {
                // sanity check - something really messed up
                throw new Error("wrong buyer: " + buyer + ", expected: " + agreement.buyer);
            }
        }
    },

    // seller side - indicate seller's percentage of the deposit to return (if any)
    mutualReleasePerSeller: function (buyer, reference, percentage) {

        this._denyValue();

        if (!Blockchain.verifyAddress(buyer)) {
            throw new Error("invalid buyer address");
        }
        if (new BigNumber(percentage).isNaN()) {
            throw new Error("invalid percentage");
        }

        reference = reference.trim();
        buyer = buyer.trim();
        var seller = Blockchain.transaction.from;
        var sellerPct = BigNumber.max(0, percentage);
        sellerPct = BigNumber.min(200, sellerPct);

        var key = buyer + seller + reference;
        var agreement = this.agreements.get(key);

        if (!agreement) {
            throw new Error("agreement does not exist: " + key);
        }
        else {
            // agreement exists
            if (agreement.seller == seller) {

                this._denyIfFulfilledOrReleased(agreement);

                // set buyer status to released
                agreement.sellerReleasePct = sellerPct;
                agreement.sellerStatus = STATUS_RELEASESUBMITTED;
                this.agreements.put(key, agreement);

                // buyer also indicated agreement as released
                if (agreement.buyerStatus === STATUS_RELEASESUBMITTED) {

                    // handle release of funds (additional checks inside function)
                    this._releaseFunds(agreement);
                }
            }
            else {
                // sanity check - something really messed up
                throw new Error("wrong seller: " + seller + ", expected: " + agreement.seller);
            }

        }

    },

    _releaseFunds: function (agreement) {

        // buyer + seller release percentages must equal 200
        var totalReleasePct = new BigNumber(agreement.buyerReleasePct).plus(agreement.sellerReleasePct);
        if (totalReleasePct != 200) {
            throw new Error("buyer and seller release percentages msut total 200");
        }
        else if (agreement.buyerDepositReceived != agreement.buyerDepositExpected) {
            throw new Error("buyer's deposit does not match expected amount");
        }
        else if (agreement.sellerDepositReceived != agreement.sellerDepositExpected) {
            throw new Error("seller's deposit does not match expected amount");
        }
        else {
            // send buyer and seller portions respectively

            var buyerClaimToBuyerDeposit =
                new BigNumber(agreement.buyerDepositReceived * (agreement.buyerReleasePct <= 100 ? agreement.buyerReleasePct : 100) / 100);
            var buyerClaimToSellerDeposit =
                new BigNumber(agreement.sellerDepositReceived * (agreement.buyerReleasePct <= 100 ? 0 : agreement.buyerReleasePct - 100) / 100);

            var buyerPortion = new BigNumber(buyerClaimToBuyerDeposit).plus(buyerClaimToSellerDeposit);

            var total = new BigNumber(agreement.buyerDepositReceived).plus(agreement.sellerDepositReceived);
            var sellerPortion = new BigNumber(total).minus(buyerPortion);

            var buyerFee = new BigNumber(buyerPortion).times(this.transactionFeePct / 100);
            var sellerFee = new BigNumber(sellerPortion).times(this.transactionFeePct / 100);

            var totalFee = new BigNumber(buyerFee).plus(sellerFee);

            var buyerPayout = new BigNumber(buyerPortion).minus(buyerFee);
            var sellerPayout = new BigNumber(sellerPortion).minus(sellerFee);

            var result;

            // if > 0, transfer buyer's portion to buyer            
            agreement.buyerDepositExpected = new BigNumber(0);
            agreement.buyerReleasePct = new BigNumber(0);
            this.agreements.put(agreement.key, agreement);

            if (new BigNumber(buyerPayout).gt(0)) {
                if (!Blockchain.transfer(agreement.buyer, buyerPayout)) {
                    throw new Error("failed to transfer buyer portion of deposit to buyer");
                }

                var _buyerPayout = new BigNumber(buyerPayout).div(NAS_FACTOR);
                this.buyerPayout = new BigNumber(this.buyerPayout).plus(_buyerPayout);
                this.totalPayout = new BigNumber(this.totalPayout).plus(_buyerPayout);
            }

            agreement.buyerDepositReceived = new BigNumber(0);
            agreement.buyerStatus = STATUS_RELEASECOMPLETED;

            agreement.sellerDepositExpected = new BigNumber(0);
            agreement.sellerReleasePct = new BigNumber(0);
            this.agreements.put(agreement.key, agreement);

            // if > 0, transfer seller's portion to seller
            if (new BigNumber(sellerPayout).gt(0)) {
                if (!Blockchain.transfer(agreement.seller, sellerPayout)) {
                    throw new Error("failed to transfer seller portion of deposit to seller");
                }

                var _sellerPayout = new BigNumber(sellerPayout).div(NAS_FACTOR);
                this.sellerPayout = new BigNumber(this.sellerPayout).plus(_sellerPayout);
                this.totalPayout = new BigNumber(this.totalPayout).plus(_sellerPayout);
            }

            agreement.sellerDepositReceived = new BigNumber(0);
            agreement.sellerStatus = STATUS_RELEASECOMPLETED;
            this.agreements.put(agreement.key, agreement);

            // if > 0, transfer fees to owner account
            if (new BigNumber(totalFee).gt(0)) {
                result = Blockchain.transfer(this.ownerAccount, totalFee);
                if (!result) {
                    throw new Error("failed to transfer fees to owner");
                }

                // update fees tally
                this.totalFees = new BigNumber(this.totalFees).plus(totalFee.div(NAS_FACTOR));
                this.buyerFees = new BigNumber(this.buyerFees).plus(buyerFee.div(NAS_FACTOR));
                this.sellerFees = new BigNumber(this.sellerFees).plus(sellerFee.div(NAS_FACTOR));

                agreement.buyerFees = new BigNumber(agreement.buyerFees).plus(buyerFee);
                agreement.sellerFees = new BigNumber(agreement.sellerFees).plus(sellerFee);
                agreement.totalFees = new BigNumber(agreement.totalFees).plus(totalFee);
                this.agreements.put(agreement.key, agreement);

            }


            // return any balance received back to buyer - no fees on this
            agreement.balanceExpected = new BigNumber(0);
            this.agreements.put(agreement.key, agreement);

            if (new BigNumber(agreement.balanceReceived).gt(0)) {
                result = Blockchain.transfer(agreement.buyer, agreement.balanceReceived);
                if (!result) {
                    throw new Error("failed to transfer balance received to buyer");
                }

                var _balanceReceived = new BigNumber(agreement.balanceReceived).div(NAS_FACTOR);
                this.buyerPayout = new BigNumber(this.buyerPayout).plus(_balanceReceived);
                this.totalPayout = new BigNumber(this.totalPayout).plus(_balanceReceived);

            }

            agreement.balanceReceived = new BigNumber(0);
            this.agreements.put(agreement.key, agreement);

            // update counts
            this.activeCount = new BigNumber(this.activeCount).minus(1);
            this.releasedCount = new BigNumber(this.releasedCount).plus(1);
        }

    },

    getAgreement: function (side, them, reference) {
        if (side == BUYER){
            return this.getAgreementPerBuyer(them, reference);
        }
        else if (side == SELLER){
            return this.getAgreementPerSeller(them, reference);
        }
        else{
            throw new Error("invalid party specification");            
        }
    },
    
    getAgreementPerBuyer: function (seller, reference) {

        this._denyValue();

        var result = Blockchain.verifyAddress(seller);
        if (!result) {
            throw new Error("invalid seller address");
        }

        if (!this.agreements) {
            throw new Error("agreements not initialized");
        }
        else {
            var buyer = Blockchain.transaction.from;
            var key = buyer + seller + reference;
            key = key.trim();

            var agreement = this.agreements.get(key);
            if (!agreement) {
                throw new Error("agreement does not exist: " + key);
            }
            else {
                // agreement exists
                return agreement;
            }
        }
    },

    getAgreementPerSeller: function (buyer, reference) {

        this._denyValue();

        var result = Blockchain.verifyAddress(buyer);
        if (!result) {
            throw new Error("invalid buyer address");
        }

        if (!this.agreements) {
            throw new Error("agreements not initialized");
        }
        else {
            var seller = Blockchain.transaction.from;
            var key = buyer + seller + reference;
            key = key.trim();

            var agreement = this.agreements.get(key);
            if (!agreement) {
                throw new Error("agreement does not exist: " + key);
            }
            else {
                // agreement exists
                return agreement;
            }
        }
    },

    // get agreement details given the buyer, seller and reference
    getAgreementPerOwner: function (buyer, seller, reference) {

        this._denyValue();

        if (Blockchain.transaction.from == this.ownerAccount) {

            var result = Blockchain.verifyAddress(buyer);
            if (!result) {
                throw new Error("invalid buyer address");
            }
            result = Blockchain.verifyAddress(seller);
            if (!result) {
                throw new Error("invalid seller address");
            }

            if (!this.agreements) {
                throw new Error("agreements not initialized");
            }
            else {
                var key = buyer + seller + reference;
                key = key.trim();


                var agreement = this.agreements.get(key);

                if (!agreement) {
                    throw new Error("agreement does not exist: " + key);
                }
                else {
                    // agreement exists
                    return agreement;
                }
            }

        }
        else {
            return "unauthorized";
        }

    },


    amITheOwner: function () {
        this._denyValue();
        if (Blockchain.transaction.from == this.ownerAccount) {
            return "yes";
        }
        else {
            return "no";
        }
    },

    updateTransactionFeePct: function (transactionFeePct) {
        this._denyValue();
        if (Blockchain.transaction.from == this.ownerAccount) {
            this.transactionFeePct = new BigNumber(transactionFeePct).div(100);
        }
        else {
            return "unauthorized";
        }
    },
    getTransactionFeePct: function () {
        this._denyValue();
        return this.transactionFeePct;
    },

    getCounts: function () {

        this._denyValue();

        var obj = {
            "TransactionFeePct": this.transactionFeePct,
            "AgreementCount": this.agreementCount,
            "ActiveCount": this.activeCount,
            "FulfilledCount": this.fulfilledCount,
            "ReleasedCount": this.releasedCount,
            "TotalFees": this.totalFees,
            "BuyerFees": this.buyerFees,
            "SellerFees": this.sellerFees,
            "TotalPayout": this.totalPayout,
            "BuyerPayout": this.buyerPayout,
            "SellerPayout": this.sellerPayout
        };

        return obj;
    },
    echo: function (text) {
        this._denyValue();
        return text;
    },

    _denyIfFulfilledOrReleased(agreement){
        if (agreement){
            var status = this._agreementStatus(agreement);
            if(status == STATUS_FULFILLCOMPLETED){
                throw new Error("agreement has been fulfilled");                    
            }
            if(status == STATUS_RELEASECOMPLETED){
                throw new Error("agreement has been mutually released");                    
            }    
        }
    },
    _denyValue: function () {
        // in case value is sent
        if (Blockchain.transaction.value.gt(0)) {
            throw new Error("please do not send value with this call");
        }
    }
};
module.exports = reTrustContract;