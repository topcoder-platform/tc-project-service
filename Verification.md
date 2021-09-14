# Topcoder Projects Service

## E2E testing with Postman

You should be able to find the tests result from the command window of running `npm run test:newman` for each test case.

Below is a sample output result of patching the project attachment by the admin.

```
project-api

Iteration 1/6

❏ Project Attachment / patch project attachment
↳ patch project attachment by admin
  PATCH http://localhost:8001/v5/projects/31/attachments/7 [200 OK, 740B, 24ms]
  ✓  Status code is 200

Iteration 2/6

↳ patch project attachment by admin
  PATCH http://localhost:8001/v5/projects/31/attachments/7 [200 OK, 761B, 24ms]
  ✓  Status code is 200

Iteration 3/6

↳ patch project attachment by admin
  PATCH http://localhost:8001/v5/projects/31/attachments/7 [200 OK, 780B, 22ms]
  ✓  Status code is 200

Iteration 4/6

↳ patch project attachment by admin
  PATCH http://localhost:8001/v5/projects/31/attachments/7 [200 OK, 832B, 22ms]
  ✓  Status code is 200

Iteration 5/6

↳ patch project attachment by admin
  PATCH http://localhost:8001/v5/projects/31/attachments/7 [200 OK, 835B, 19ms]
  ✓  Status code is 200

Iteration 6/6

↳ patch project attachment by admin
  PATCH http://localhost:8001/v5/projects/31/attachments/7 [200 OK, 797B, 18ms]
  ✓  Status code is 200

┌─────────────────────────┬──────────────────┬──────────────────┐
│                         │         executed │           failed │
├─────────────────────────┼──────────────────┼──────────────────┤
│              iterations │                6 │                0 │
├─────────────────────────┼──────────────────┼──────────────────┤
│                requests │                6 │                0 │
├─────────────────────────┼──────────────────┼──────────────────┤
│            test-scripts │                6 │                0 │
├─────────────────────────┼──────────────────┼──────────────────┤
│      prerequest-scripts │                6 │                0 │
├─────────────────────────┼──────────────────┼──────────────────┤
│              assertions │                6 │                0 │
├─────────────────────────┴──────────────────┴──────────────────┤
│ total run duration: 436ms                                     │
├───────────────────────────────────────────────────────────────┤
│ total data received: 2.62KB (approx)                          │
├───────────────────────────────────────────────────────────────┤
│ average response time: 21ms [min: 18ms, max: 24ms, s.d.: 2ms] │
└───────────────────────────────────────────────────────────────┘
```

Then you can run `npm run test:newman:clear` to delete all testing data by above postman tests.  

If 'socket hang up' appears while running the `npm run test:newman`. You can increase the `WAIT_TIME` by setting the environment variable.
Then run `npm run test:newman:clear` and run `npm run test:newman` again. Sometimes you may encounter some server error like server timeout issue. Just rerun the tests.
