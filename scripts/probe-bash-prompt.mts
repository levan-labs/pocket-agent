import { OpenCodeProvider } from '../packages/opencode-adapter/src/OpenCodeProvider.ts'

async function main() {
  const p = new OpenCodeProvider()
  await p.connect({ baseUrl: 'http://127.0.0.1:4096' })
  const session = await p.createSession({ title: 'bash-ui-probe' })
  console.log('session', session.id)

  for await (const e of p.sendMessage(
    session.id,
    'Use the bash tool to run: pwd\nYou must call the bash tool. Do not only describe it.',
  )) {
    if (e.type === 'permission.requested') {
      console.log('PERMISSION', JSON.stringify(e.request, null, 2))
      await p.approvePermission(e.request.id)
      console.log('approved')
    } else if (e.type === 'message.delta') {
      process.stdout.write(e.text)
    } else {
      console.log('event', e.type, e.type === 'error' ? e.message : '')
    }
  }
  console.log('\ndone')
  await p.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
