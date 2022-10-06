# @cryptolions/msig-tool
Web tool to build multi-signature transaction on EOSIO chains

###Installation
----
`$ npm install --save @cryptolions/msig-tool`

###Usage
----
    import { Msig } from '@cryptolions/msig-tool';
	...
	const config = {
	    expirationDate: new Date(),
		nameOfProposal: 'Test msig',
		proposerName: 'cryptolions1'
	}
	const rpc = new JsonRpc('https://api.waxtest.alohaeos.com');
	const msig = new Msig({ accountName: 'cryptolions1', permission: 'active' }, config, rpc);
	const actionExample = {
		account: 'eosio.token',
		name: 'transfer',
		authorization: [{ actor: 'cryptolions1', permission: 'active' }],
		data: {
			from: 'cryptolions1',
			to: 'cryptolions2',
			quantity: '1.0000000 WAX',
			memo: 'Msig tool',
		}
	}

	msig.generateMsig([actionExample]).then(res => {
        ...
    })
