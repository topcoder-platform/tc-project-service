
import models from '../models'

export default {
  clearDb: done =>  {
    return models.sequelize.sync({force: true})
      .then(() => {
        if (done) done()
      })
  },
  mockHttpClient: {
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: () => {} } },
  },
  jwts: {
    // userId = 40051332,roles: [ 'Topcoder copilot' ],handle: 'test1',email: 'test@topcoder.com'
    copilotUser: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBjb3BpbG90Il0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOjQwMDUxMzMyLCJlbWFpbCI6InRlc3RAdG9wY29kZXIuY29tIiwiaWF0IjoxNDcwNjIwMDQ0fQ.HUhRM1G6jwBt8Kv2slPYndhVUdYXXBAH174fPzqpFME',
    // userId = 40051331
    member: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6W10sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMSIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.p13tStpp0A1RJjYJ2axSKCTx7lyWIS3kYtCvs8u88WM',
    // userId = 40051332
    copilot: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJjb3BpbG90Il0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMiIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.tY_eE9fjtKQ_Hp9XPwmhwMaaTdOYKoR09tdGgvZ8RLw',
    // userId = 40051333
    admin: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbmlzdHJhdG9yIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMyIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.uiZHiDXF-_KysU5tq-G82oBTYBR0gV_w-svLX_2O6ts'
  }
}
