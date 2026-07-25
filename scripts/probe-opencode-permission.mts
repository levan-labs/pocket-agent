import { OpenCodeProvider } from '../packages/opencode-adapter/src/OpenCodeProvider.ts'

async function main() {
  const p = new OpenCodeProvider()
  await p.connect({ baseUrl: 'http://127.0.0.1:4096' })
  const session = await p.createSession({ title: 'perm-probe' })
  console.log('session:', session.id)
  console.log('caps:', p.getCapabilities())

  for await (const e of p.sendMessage(
    session.id,
    'Use the bash tool to run exactly: pwd\nDo not invent the output. You must call the tool.',
  )) {
    console.log('event:', e.type)
    if (e.type === 'permission.requested') {
      console.log('permission:', e.request)
      await p.approvePermission(e.request.id)
      console.log('approved')
    }
    if (e.type === 'message.delta') {
      process.stdout.write(e.text)
    }
    if (e.type === 'message.end') {
      console.log('\n--- end ---')
    }
    if (e.type === 'error') {
      console.log('error:', e.message)
    }
  }

  await p.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
