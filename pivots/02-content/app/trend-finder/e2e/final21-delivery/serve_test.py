"""Pure policy/patch tests; no app import, server, sockets, or browser execution."""
import importlib.util
import ast
from pathlib import Path
import subprocess
import unittest

spec = importlib.util.spec_from_file_location('delivery_launcher', Path(__file__).with_name('serve.py'))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class DeliveryPolicyTest(unittest.TestCase):
    def test_environment_preserves_home_with_independent_private_tmp(self):
        fixture = {'HOME': '/Users/qa-fixture', 'UNRELATED_SETTING': 'ordinary-fixture'}
        env = launcher.delivery_environment(fixture['HOME'], Path('/private/delivery-state/tmp'))
        self.assertEqual(env['HOME'], fixture['HOME'])
        self.assertEqual(env['TMPDIR'], '/private/delivery-state/tmp')
        self.assertNotEqual(env['HOME'], str(Path(env['TMPDIR']).parent))
        self.assertEqual(set(env), {'PATH', 'HOME', 'TMPDIR', 'BUILDCLUB_OFFLINE_VERIFY', 'PYTHONDONTWRITEBYTECODE'})
        self.assertNotIn('FAL_KEY', env)
        self.assertNotIn('OPENROUTER_API_KEY', env)
        self.assertEqual(env['BUILDCLUB_OFFLINE_VERIFY'], '1')
        self.assertEqual(fixture, {'HOME': '/Users/qa-fixture', 'UNRELATED_SETTING': 'ordinary-fixture'})

    def test_home_capture_precedes_environment_clear(self):
        tree = ast.parse(Path(launcher.__file__).read_text())
        main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
        capture = next(n.lineno for n in ast.walk(main) if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'delivery_user_home' for t in n.targets))
        clear = next(n.lineno for n in ast.walk(main) if isinstance(n, ast.Call) and ast.unparse(n.func) == 'os.environ.clear')
        self.assertLess(capture, clear)

    def test_needed_routes_only(self):
        for method, path in [('POST', launcher.P + '/shots/0/takes'), ('PUT', launcher.P + '/edit'), ('POST', launcher.P + '/edit/export'), ('POST', launcher.P + '/cut/review'), ('GET', '/api/review/local-token')]:
            self.assertTrue(launcher.allowed(method, path))
        for method, path in [('POST', launcher.P + '/gen'), ('PUT', launcher.P + '/canvas'), ('POST', launcher.P + '/voice'), ('POST', '/api/search'), ('POST', '/api/review/local-token/decide'), ('POST', launcher.P + '/shots/1/takes'), ('DELETE', launcher.P + '/takes/id'), ('POST', '/api/unknown')]:
            self.assertFalse(launcher.allowed(method, path))

    def test_existing_browser_and_explicit_download_rejection(self):
        source = (launcher.APP / 'render/render-reel.mjs').read_text()
        patched = launcher.render_source(source)
        self.assertNotIn('await ensureBrowser()', patched)
        self.assertEqual(patched.count('await ensureBrowser({browserExecutable: existing, onBrowserDownload: denyDownload})'), 2)
        self.assertEqual(patched.count('onBrowserDownload: denyDownload'), 4)
        self.assertIn("throw new Error('Browser download forbidden')", patched)
        self.assertIn("if (!existing || !existsSync(existing))", patched)
        deny = next(line.strip() for line in patched.splitlines() if 'const denyDownload =' in line)
        subprocess.run(['node', '-e', deny + " require('node:assert/strict').throws(() => denyDownload(), /Browser download forbidden/);"], check=True)
        subprocess.run(['node', '--input-type=module', '--check'], input=patched, text=True, check=True)

    def test_installed_sdk_supports_download_guard_and_explicit_path(self):
        sdk = launcher.APP / 'node_modules/@remotion/renderer/dist'
        ensure = (sdk / 'ensure-browser.js').read_text()
        self.assertIn('options.browserExecutable', ensure)
        self.assertIn('options.onBrowserDownload', ensure)
        self.assertIn("type: 'user-defined-path'", ensure)
        self.assertLess(ensure.index("defaultStatus.type === 'user-defined-path'"), ensure.index('onBrowserDownload({ chromeMode })'))
        for name in ('select-composition.d.ts', 'render-media.d.ts'):
            self.assertIn('onBrowserDownload', (sdk / name).read_text())

    def test_changed_renderer_stops_instead_of_guessing(self):
        with self.assertRaisesRegex(ValueError, 'Renderer changed'):
            launcher.render_source('unknown renderer')


if __name__ == '__main__':
    unittest.main()
