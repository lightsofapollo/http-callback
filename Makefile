REPORTER := spec

test::
	./node_modules/mocha/bin/mocha --reporter $(REPORTER) test/*-test.js
