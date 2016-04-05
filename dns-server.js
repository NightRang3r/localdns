var util = require('util');
var config = require('config');
var dnsd = require('dnsd');
var db = require('./db')();
var User = require('./models/user');

var server = dnsd.createServer(function(req, res) {
	var question = res.question && res.question[0];

	console.log('%s lookup for domain: %s', question.name, question.type);

	if (question.name !== config.domain && !question.name.endsWith('.' + config.domain)) {
		res.responseCode = 5; // Refused
		return res.end();
	}

	if (question.name === config.domain || question.name === 'www.' + config.domain || question.name === 'ns1.' + config.domain) {
		config.dns.records.forEach(function(record) {
			var name = record.name ? record.name + '.' + config.domain : config.domain;
			if (name === question.name) {
				if ((question.type !== 'A' && question.type !== 'NS') || record.type === question.type) {
					res.answer.push({ 'name': name, 'type': record.type, 'data': record.data });
				}
			}
		});

		// switch (question.type) {
		// 	case 'A':
		// 		res.answer.push({ 'name': question.name, 'type': 'A', 'data': config.ip });
		// 		break;
		// 	case 'NS':
		// 		res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
		// 		break;
		// 	case '*':
		// 		res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
        //         res.answer.push({ 'name': question.name, 'type': 'A', 'data': config.ip });
		// }

		return res.end();
	}

	try {
		var user = User.findOne({ sub: question.name.substring(0, question.name.lastIndexOf('.' + config.domain)) }, function (err, doc) {
			if (!err && doc) {
				switch (question.type) {
					case 'A':
						res.answer.push({ 'name': question.name, 'type': 'A', 'data': doc.ip });
						break;
					case 'NS':
						res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
						break;
					case '*':
						res.answer.push({ 'name': question.name, 'type': 'NS', 'data': 'ns1.' + config.domain });
						res.answer.push({ 'name': question.name, 'type': 'A', 'data': doc.ip });
				}
			} else {
				res.responseCode = 3;
			}
			return res.end();
		});
	} catch (ex) {
		return res.end();
	}
});

server.zone(config.domain, 'ns1.' + config.domain, config.contact || 'contact@' + config.domain, 'now', '2h', '30m', '2w', '1m').listen(process.env.PORT || config.dns.port || 53, process.env.HOST || config.dns.host || '0.0.0.0');
