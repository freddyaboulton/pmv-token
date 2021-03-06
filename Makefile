install-sol:
	cd pmv-sol && npm install && cd app && npm install

install-eth:
	npm install

.PHONY: install-deps
install: install-eth install-sol

build-sol:
	cd pmv-sol && anchor build && cp target/idl/* app/idl/

launch-app:
	cd pmv-sol/app && node -r dotenv/config initialize-sol-contract.js && node -r dotenv/config app.js &

launch-node:
	cd pmv-eth && npx hardhat node &

deploy-pmv-test: launch-node
	cd pmv-eth && npx hardhat run --network localhost scripts/deploy-local-testing.js

test-sol:
	cd pmv-sol && npm test

test-sol-integration_: deploy-pmv-test launch-app
	sleep 10 && cd pmv-sol/app && npm test

test-sol-integration: test-sol-integration_
	kill -9 $$(ps aux | grep '\snode\s' | awk '{print $$2}')

kill-servers:
	kill -9 $$(ps aux | grep '\snode\s' | awk '{print $$2}')

build-eth:
	cd pmv-eth && npx hardhat compile && cp artifacts/contracts/PMV.sol/PMV.json ../pmv-sol/app/idl && cp artifacts/contracts/PiratesOfTheMetaverse.sol/PiratesOfTheMetaverse.json ../pmv-sol/app/idl

test-eth: build-eth
	cd pmv-eth && npx hardhat test

lint-sol:
	cd pmv-sol && npx eslint app

lint-eth:
	cd pmv-eth && npx eslint test scripts --ignore-pattern test/ERC721* --ignore-pattern test/match-openzeppelin* --ignore-pattern test/SupportsInterface*

.PHONY: lint
lint: lint-eth lint-sol

lint-sol-fix:
	cd pmv-sol && npx eslint app --fix

lint-eth-fix:
	cd pmv-eth && npx eslint test scripts --fix

.PHONY: lint-fix
lint-fix: lint-eth-fix lint-sol-fix
