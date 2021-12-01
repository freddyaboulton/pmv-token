.PHONY: install-deps
install-deps-linux:
	npm install

.PHONY: build
build:
	npx hardhat compile

.PHONY: test
test: build
	npx hardhat test

.PHONY: lint
lint: 
	npx eslint test
	npx eslint pmv-sol/app