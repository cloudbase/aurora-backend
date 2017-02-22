export class ValidatorError {
  constructor(
    public attribute: string,
    public value: any,
    public validator: string,
    public message: string
  ) {}

  static REQUIRED_VALIDATOR: string = 'required';
}