import TronUtils from 'tronutils';
import crypto from 'crypto';
import Logger from 'lib/logger';

const logger = new Logger('wallet');

const algorithm = "aes-256-ctr";
const WALLET_LOCALSTORAGE_KEY = "TW_WALLET";

function encrypt(text, password) {
    let cipher = crypto.createCipher(algorithm, password);
    let crypted = cipher.update(text, "utf8", "hex");
    crypted += cipher.final("hex");
    return crypted;
}

function decrypt(text, password) {
    let decipher = crypto.createDecipher(algorithm, password);
    let dec = decipher.update(text, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
}

export const WALLET_STATUS = {
    UNINITIALIZED: 'UNINITIALIZED',
    LOCKED: 'LOCKED',
    UNLOCKED: 'UNLOCKED'
};

export default class Wallet {
    constructor() {
        this.loadStorage();
    }

    loadStorage() {
        try {
            let loaded = window.localStorage.getItem(WALLET_LOCALSTORAGE_KEY);
            if (loaded) {
                this.storage = JSON.parse(loaded);
            } else {
                this.storage = {};
            }
        } catch (e) {
            this.storage = {};
        }
    }

    saveStorage(pass = null) {
        logger.info("saving storage with:" + pass);
        logger.info(this);
        if (pass === null)
            throw "Storage can't be saved without a password.";

        /*THIS MUST NEVER CONTAIN UNENCRYPTED INFORMATION*/
        let toStore = {
            encrypted: encrypt(JSON.stringify(this.storage.decrypted), pass)
        };
        this.encrypted = toStore.encrypted;

        logger.info("tostore:");
        logger.info(toStore);

        window.localStorage.setItem(WALLET_LOCALSTORAGE_KEY, JSON.stringify(toStore));
        this.pass = pass;
    }

    addAccount(newAccount) {
        this.storage.decrypted.accounts[newAccount.address] = newAccount;
    }

    initWallet(pass = null) {
        // please remove this Till
        logger.info('init wallet with pass: ' + pass);
        if (this.storage.decrypted)
            throw "Wallet cannot be initialized while another wallet already exists.";
        if (pass === null)
            throw "Wallet cannot be initialized without passing a password.";

        this.storage.decrypted = {
            accounts: {}
        };
        this.addAccount(TronUtils.accounts.generateRandomBip39());
        this.saveStorage(pass);
    }

    isInitialized() {
        logger.info('isInitialized:');
        logger.info(this);
        return this.storage.encrypted;
    }

    getStatus() {
        if (!this.isInitialized()) {
            return WALLET_STATUS.UNINITIALIZED;
        } else if (this.storage.decrypted) {
            return WALLET_STATUS.UNLOCKED;
        } else {
            return WALLET_STATUS.LOCKED;
        }
    }

    unlockWallet(pass = null) {
        try {
            this.storage.decrypted = JSON.parse(decrypt(this.storage.encrypted, pass));
            return true;
        } catch (e) {
            logger.warn('error unlocking wallet');
            logger.error(e);
            return false;
        }
    }

    getAccount(index = 0) {
        if (this.storage.decrypted) {
            return TronUtils.accounts.accountFromPrivateKey(this.storage.decrypted.accounts[index].privateKey);
        } else {
            return null;
        }
    }
}