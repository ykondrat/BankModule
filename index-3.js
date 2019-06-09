// Core
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');

class BankModule extends EventEmitter {
    constructor (props) {
        super(props);

        // state
        this.users = [];

        // Listeners
        this.on('add', this._addListener);
        this.on('get', this._getListener);
        this.on('send', this._sendListener);
        this.on('withdraw', this._withdrawListener);
        this.on('changeLimit', this._changeLimitListener);
        this.on('error', this._errorListener);
    }

    register (user) {
        this._validateUser(user);
        this._checkExistence(user.name);
        this._validateBalance(user.balance);

        const id = crypto.randomBytes(16).toString('hex');

        this.users.push({
            ...user,
            id
        });

        return id;
    }

    _addListener (personId, amount) {
        const currentUser = this._getUser(personId);
        amount = this._validateAmount(amount);

        if (amount) {
            this._addAmount(currentUser, amount);
        }
    }

    _getListener (personId, cb) {
        const currentUser = this._getUser(personId);
        cb = this._validateCallBack(cb);

        if (cb) {
            cb(currentUser.balance);
        }
    }

    _sendListener (personFirstId, personSecondId, amount) {
        const firstUser = this._getUser(personFirstId);
        const secondUser = this._getUser(personSecondId);
        amount = this._validateAmount(amount);

        if (amount) {
            if (this._removeAmount(firstUser, amount)) {
                this._addAmount(secondUser, amount);
            }
        }
    }

    _withdrawListener (personId, amount) {
        const currentUser = this._getUser(personId);
        amount = this._validateAmount(amount);

        if (amount) {
            this._removeAmount(currentUser, amount);
        }
    }

    _changeLimitListener (personId, cb) {
        const currentUser = this._getUser(personId);
        cb = this._validateCallBack(cb);

        if (cb) {
            this._testLimitCallBack(cb);
            currentUser.limit = cb;

            this.users = this.users.map(
                user => user.id === currentUser.id ? currentUser : user
            );
        }
    }

    _errorListener (error) {
        if (error.name === 'TypeError') {
            console.error(
                `Received ${error.name} with a message: '${error.message}'`,
            );
        } else if (error.name === 'Error') {
            throw error;
        }
    }

    _addAmount (currentUser, amount) {
        currentUser.balance += amount;

        this.users = this.users.map(
            user => user.id === currentUser.id ? currentUser : user
        );
    }

    _removeAmount (currentUser, amount) {
        if (!currentUser.limit(amount, currentUser.balance, currentUser.balance - amount)) {
            this.emit(
                'error',
                new Error(`User over limit: ${currentUser.id}`)
            );
        }
        if ((currentUser.balance - amount) < 0) {
            this.emit(
                'error',
                new TypeError(`Unable to remove the amount from user: ${currentUser.id}`)
            );
        } else {
            currentUser.balance -= amount;

            this.users = this.users.map(
                user => user.id === currentUser.id ? currentUser : user
            );

            return true;
        }

        return false;
    }

    _getUser (personId) {
        const user = this.users.find(({ id }) => id === personId);

        if (!user) {
            this.emit(
                'error',
                new Error(`No such user with id: ${personId}`)
            );
        }

        return user;
    }

    _validateCallBack (cb) {
        if (typeof cb !== 'function') {
            this.emit(
                'error',
                new TypeError(`cb is not a function`)
            );

            return null;
        }

        return cb;
    }

    _testLimitCallBack (cb) {
        let result;

        try {
            result = cb(100, 200, 100);
        } catch (error) {
            throw error;
        }

        if (typeof result !== 'boolean') {
            throw new TypeError(
                'limit callback must return boolean'
            );
        }
    }

    _validateAmount (amount) {
        if (typeof amount !== 'number' || amount <= 0) {
            this.emit(
                'error',
                new TypeError(
                    `Unable to add for user negative or zero balance or contains not a valid data type`
                )
            );

            return null;
        }

        return amount;
    }

    _validateBalance (balance) {
        if (balance <= 0) {
            throw new Error(
                'Unable to add user with negative or zero balance'
            );
        }
    }

    _checkExistence (userName) {
        const user = this.users.find(({ name }) => name === userName);

        if (user) {
            throw new Error(
                `User already exist. User name: ${userName}`
            );
        }
    }

    _validateUser ({ name, balance, limit }) {
        if (!name || typeof name !== 'string') {
            throw new TypeError(
                'name does not exist or contains not a valid data type'
            );
        }

        if (typeof balance !== 'number') {
            throw new TypeError(
                'balance does not exist or contains not a valid data type'
            );
        }

        if (typeof limit !== 'function') {
            throw new TypeError(
                'limit does not exist or contains not a valid data type'
            );
        }
    }
}
