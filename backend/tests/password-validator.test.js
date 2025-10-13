const passwordValidator = require('../utils/passwordValidator');

describe('Password Validator', () => {
  describe('validate', () => {
    it('should reject empty passwords', () => {
      const result = passwordValidator.validate('');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('required');
    });

    it('should reject passwords shorter than minimum length', () => {
      const result = passwordValidator.validate('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('12 characters');
    });

    it('should reject passwords longer than maximum length', () => {
      const longPassword = 'A'.repeat(129) + 'b1!';
      const result = passwordValidator.validate(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('128 characters');
    });

    it('should reject passwords with common patterns', () => {
      const result = passwordValidator.validate('MyPassword123!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('common patterns');
    });

    it('should reject passwords with insufficient variety', () => {
      const result = passwordValidator.validate('lowercaseonly123');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('3 of the following');
    });

    it('should reject passwords with repeating characters', () => {
      const result = passwordValidator.validate('PasswooordABC123!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('repeating characters');
    });

    it('should reject passwords with sequential characters', () => {
      const result = passwordValidator.validate('abcDefghiJK123!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('sequential characters');
    });

    it('should accept valid passwords', () => {
      const validPasswords = [
        'P@ssw0rd$2023X',
        'Secure!Passphrase#42',
        'C0mpl3x!P@ssw0rd',
        'N0t!Simple$Pass',
        'MyP@ssphrase!2023'
      ];

      validPasswords.forEach(password => {
        const result = passwordValidator.validate(password);
        expect(result.isValid).toBe(true);
        expect(result.message).toContain('meets all requirements');
      });
    });
  });

  describe('getRequirements', () => {
    it('should return formatted requirements string', () => {
      const requirements = passwordValidator.getRequirements();
      expect(requirements).toContain('12-128 characters');
      expect(requirements).toContain('Uppercase letters');
      expect(requirements).toContain('Lowercase letters');
      expect(requirements).toContain('Numbers');
      expect(requirements).toContain('Special characters');
    });
  });
});