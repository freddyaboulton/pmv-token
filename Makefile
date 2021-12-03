install-sol:
	cd pmv-sol && npm install && cd app && npm install

install-eth:
	npm install

.PHONY: install-deps
install: install-eth install-sol

build-sol:
	cd pmv-sol && anchor build && cp target/idl/* app/idl/

launch-app:
	cd pmv-sol/app && env MY_WALLET=$$HOME/.config/solana/id.json node app.js &

test-sol-contract:
	cd pmv-sol && npm test

test-sol-app: launch-app
 	cd pmv-sol/app && npm test

test-sol: test-sol-contract test-sol-app
	kill -9 $$(ps aux | grep '\snode\s' | awk '{print $$2}')

build-eth:
	cd pmv-eth && npx hardhat compile

test-eth: build-eth
	cd pmv-eth && npx hardhat test

lint-sol:
	cd pmv-sol && npx eslint app

lint-eth: lint-sol
	cd pmv-eth && npx eslint test

.PHONY: lint
lint: lint-eth lint-sol

lint-sol-fix:
	cd pmv-sol && npx eslint app --fix

lint-eth-fix: lint-sol-fix
	cd pmv-eth && npx eslint test --fix

.PHONY: lint-fix
lint-fix: lint-eth-fix lint-sol-fix
