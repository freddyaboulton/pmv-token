.PHONY: install-deps
install-deps-linux:
	npm install

.PHONY: build
build:
	npx hardhat compile

.PHONY: test
test: build
	npx hardhat test
