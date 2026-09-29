import { expect } from 'chai';
import { describe, it } from 'vitest';
import { assertOk } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

describe('RF-20 regression - cancel a confirmed movement', () => {
  it('a 409 for an already cancelled movement throws ApiError with status 409', () => {
    // Arrange
    const result = {
      response: new Response(null, { status: 409 }),
      error: { statusCode: 409, message: 'Movement is already cancelled' },
    };

    // Act
    const cancel = () => assertOk(result);

    // Assert
    expect(cancel, 'thrown ApiError')
      .to.throw(ApiError, /Movement is already cancelled/)
      .that.includes({ status: 409 });
  });

  it('a 204 does not throw', () => {
    // Arrange
    const result = { response: new Response(null, { status: 204 }) };

    // Act
    const cancel = () => assertOk(result);

    // Assert
    expect(cancel, 'assertOk on a 204').to.not.throw();
  });

  it('a 404 throws ApiError with status 404', () => {
    // Arrange
    const result = {
      response: new Response(null, { status: 404 }),
      error: { statusCode: 404, message: 'Movement not found' },
    };

    // Act
    const cancel = () => assertOk(result);

    // Assert
    expect(cancel, 'thrown ApiError').to.throw(ApiError).that.includes({ status: 404 });
  });
});
