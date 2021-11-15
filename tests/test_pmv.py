import pytest


@pytest.fixture
def pmv_contract(PMV, accounts):
    # deploy the contract with the initial value as a constructor argument
    yield PMV.deploy({'from': accounts[0]})


def test_init(pmv_contract, accounts):
    assert accounts[0].address == pmv_contract.owner()
    assert pmv_contract.TOTAL_SUPPLY() == 10


def test_cannot_buy_if_out_of_stock(pmv_contract, accounts):
    pmv_contract.mint(9, {'from': accounts[1], 'value': "0.18 ether"})
    
    # For some reason, linux workers don't raise VirtualMachineError
    with pytest.raises(Exception):
        pmv_contract.mint(2, {'from': accounts[3], 'value': "0.04 ether"})

    pmv_contract.mint(1, {'from': accounts[5], 'value': '0.02 ether'})

    with pytest.raises(Exception):
        pmv_contract.mint(2, {'from': accounts[7], 'value': "0.04 ether"})


def test_can_mint_during_sale(pmv_contract, accounts):
    pmv_contract.mint(1, {'from': accounts[4], 'value': "0.02 ether"})
    pmv_contract.mint(2, {'from': accounts[5], 'value': "0.04 ether"})
    assert pmv_contract.balanceOf(accounts[4]) == 1
    assert pmv_contract.balanceOf(accounts[5]) == 2
