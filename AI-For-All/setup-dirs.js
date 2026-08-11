const fs = require('fs');
const path = require('path');

const dirs = [
  'app/(learner)/start',
  'app/(learner)/auth',
  'app/(learner)/profile',
  'app/(learner)/dashboard',
  'app/(learner)/stories/[id]',
  'app/(learner)/archive',
  'app/(learner)/rewards',
  'app/admin/(cms)/dashboard',
  'app/admin/(cms)/goalboard',
  'app/admin/(cms)/stories/create',
  'app/admin/(cms)/learners',
  'app/admin/login',
  'components/learner',
  'components/admin'
];

dirs.forEach(d => fs.mkdirSync(path.join(__dirname, d), { recursive: true }));

console.log('Directories created successfully.');
