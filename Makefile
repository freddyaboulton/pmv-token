install-sol:
	cd pmv-sol && npm install

install-eth:
	npm install

.PHONY: install-deps
install: install-eth install-sol

build-sol:
	cd pmv-sol && anchor build && cp target/idl/* app/idl/

test-sol: launch-app
	cd pmv-sol && npm test

build-eth:
	cd pmv-eth && npx hardhat compile

test-eth: build-eth
	cd pmv-eth && npx hardhat test

.PHONY: test
test: test-eth

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
