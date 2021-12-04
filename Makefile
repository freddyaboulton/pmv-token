install-sol:
	cd pmv-sol && npm install && cd app && npm install

install-eth:
	npm install

.PHONY: install-deps
install: install-eth install-sol

build-sol:
	cd pmv-sol && anchor build && cp target/idl/* app/idl/

launch-app:
	cd pmv-sol/app && env MY_WALLET=$$HOME/.config/solana/id.json node -r dotenv/config app.js &

launch-node:
	cd pmv-eth && npx hardhat node &

deploy-pmv-test: launch-node
	cd pmv-eth && npx hardhat run --network localhost scripts/deploy-local-testing.js

test-sol:
	cd pmv-sol && npm test

test-sol-integration_: deploy-pmv-test launch-app
	sleep 3 && cd pmv-sol/app && npm test

test-sol-integration: test-sol-integration_
	kill -9 $$(ps aux | grep '\snode\s' | awk '{print $$2}')

kill-servers:
	kill -9 $$(ps aux | grep '\snode\s' | awk '{print $$2}')

build-eth:
	cd pmv-eth && npx hardhat compile && cp artifacts/contracts/PMV.sol/PMV.json ../pmv-sol/app/idl

test-eth: build-eth
	cd pmv-eth && npx hardhat test

lint-sol:
	cd pmv-sol && npx eslint app

lint-eth:
	cd pmv-eth && npx eslint test scripts

.PHONY: lint
lint: lint-eth lint-sol

lint-sol-fix:
	cd pmv-sol && npx eslint app --fix

lint-eth-fix:
	cd pmv-eth && npx eslint test scripts --fix

.PHONY: lint-fix
lint-fix: lint-eth-fix lint-sol-fix
