"""Import this reviewed editorial delivery; hash every byte before writing sources."""
from pathlib import Path, PurePosixPath
import base64, hashlib, json, lzma, shutil
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'content/editorial-transport'
EXPECTED = '217cd10910cd1c016a3e2a36e602f6a078d7b701a00dc9c51067f0c4665f6ba1'
ALLOWED = {
    'content/editorial/help-build.json', 'content/editorial/members.json',
    'content/editorial/references.json', 'content/editorial/workspace.json',
    'content/editorial-baseline.json', 'content/editorial-legacy-anchors.json',
    'content/editorial-charter.md', 'content/editorial-templates.md',
    'content/editorial-decisions.md', 'content/editorial-provenance.json',
    'scripts/editorial/verify_public.py', 'scripts/editorial/requirements.txt',
    'scripts/editorial/source_evidence.py', 'scripts/editorial/build.py',
    'tests/editorial_contract.py', 'tests/editorial_browser.py',
    'assets/editorial-members.css', 'scripts/build_practical_guides.py',
    'scripts/help_guide_content.py',
}

def main():
    if not SOURCE.exists():
        print('Readable editorial sources already imported.')
        return
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    assert manifest['schema'] == 1 and manifest['parts'] == 9
    encoded = ''.join((SOURCE / f'part-{i:02d}.b64').read_text().strip() for i in range(9))
    raw = base64.b64decode(encoded, validate=True)
    assert len(raw) <= 200_000 and hashlib.sha256(raw).hexdigest() == EXPECTED
    decoder = lzma.LZMADecompressor(memlimit=128_000_000)
    decoded = decoder.decompress(raw, max_length=2_000_000)
    assert decoder.eof and not decoder.unused_data
    payload = json.loads(decoded)
    assert payload['schema'] == 1 and len(payload['files']) == len(ALLOWED)
    expected_files = {x['path']: x['sha256'] for x in manifest['files']}
    assert set(expected_files) == ALLOWED
    prepared = {}
    for item in payload['files']:
        path = PurePosixPath(item['path'])
        assert not path.is_absolute() and '..' not in path.parts
        assert str(path) in ALLOWED and str(path) not in prepared
        target = ROOT.joinpath(*path.parts)
        assert target.resolve().is_relative_to(ROOT) and not target.is_symlink()
        text = item['text'].encode('utf-8')
        assert hashlib.sha256(text).hexdigest() == item['sha256'] == expected_files[str(path)]
        prepared[str(path)] = text
    for name, text in prepared.items():
        target = ROOT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text)
    shutil.rmtree(SOURCE)
    print('Imported and verified', len(prepared), 'readable source files; temporary transport removed.')

if __name__ == '__main__':
    main()
