import { describe, it, expect } from 'vitest';
import { resolveRuntime } from '../src/config.js';

describe('resolveRuntime', () => {
  it('defaults to manifest mode with empty prefix', () => {
    expect(resolveRuntime({}, {})).toMatchObject({ mode: 'manifest', prefix: '' });
  });

  it('S3_REDIRECTS_APPLY flips manifest → reconcile', () => {
    expect(resolveRuntime({}, { S3_REDIRECTS_APPLY: '1' }).mode).toBe('reconcile');
    expect(resolveRuntime({}, { S3_REDIRECTS_APPLY: 'true' }).mode).toBe('reconcile');
  });

  it('an explicit mode option wins over the env flag', () => {
    expect(resolveRuntime({ mode: 'apply' }, { S3_REDIRECTS_APPLY: '1' }).mode).toBe('apply');
    expect(resolveRuntime({ mode: 'manifest' }, { S3_REDIRECTS_APPLY: '1' }).mode).toBe('manifest');
  });

  it('env fills bucket / prefix / region', () => {
    expect(
      resolveRuntime({}, { S3_REDIRECTS_BUCKET: 'b', S3_REDIRECTS_PREFIX: 'alpha', AWS_REGION: 'us-east-1' }),
    ).toMatchObject({ bucket: 'b', prefix: 'alpha', region: 'us-east-1' });
  });

  it('S3_REDIRECTS_REGION takes precedence over AWS_REGION', () => {
    expect(resolveRuntime({}, { S3_REDIRECTS_REGION: 'eu-west-1', AWS_REGION: 'us-east-1' }).region).toBe('eu-west-1');
  });

  it('options win over env', () => {
    const c = resolveRuntime(
      { bucket: 'opt', prefix: 'optpfx', region: 'eu-west-1' },
      { S3_REDIRECTS_BUCKET: 'env', S3_REDIRECTS_PREFIX: 'envpfx', AWS_REGION: 'us-east-1' },
    );
    expect(c).toMatchObject({ bucket: 'opt', prefix: 'optpfx', region: 'eu-west-1' });
  });
});
