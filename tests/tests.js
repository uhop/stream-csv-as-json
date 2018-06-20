'use strict';

const unit = require('heya-unit');

require('./test_parser');
require('./test_sliding');
require('./test_main');
require('./test_stringer');

unit.run();
