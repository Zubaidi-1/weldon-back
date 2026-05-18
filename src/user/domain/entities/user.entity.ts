export class UserEntity {
  constructor(
    public id: number | null,
    public firstName: string,
    public lastName: string,
    public name: string,
    private _email: string,
    private _password: string | null,
    private _phoneNumber: string,
    private _refreshToken: string | null,
    public role: string = 'USER',
    public isVerified?: boolean,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  //  Request (creating user)
  static createUserRequest(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    phoneNumber: string,
    refreshToken?: string,
    isVerified?: boolean,
  ) {
    const name = `${firstName} ${lastName}`;

    return new UserEntity(
      null,
      firstName,
      lastName,
      name,
      email,
      password,
      phoneNumber,
      refreshToken ?? null,
      'USER',
      isVerified,
    );
  }

  //  Response (no password)
  static createUserResponse(
    id: number,
    email: string,
    firstName: string,
    lastName: string,
    name: string,
    phoneNumber: string,
    refreshToken?: string,
    role: string = 'USER',
    isVerified?: boolean,
  ) {
    return new UserEntity(
      id,
      firstName,
      lastName,
      name,
      email,
      null,
      phoneNumber,
      refreshToken ?? null,
      role,
      isVerified,
    );
  }

  get idValue() {
    return this.id;
  }

  get email() {
    return this._email;
  }
  get password() {
    return this._password;
  }
  get number() {
    return this._phoneNumber;
  }
  get refreshToken() {
    return this._refreshToken;
  }
}
