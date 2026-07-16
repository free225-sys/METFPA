jest.mock("@/lib/metfpaApi", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}), { virtual: true });
jest.mock("@/lib/api", () => ({ formatApiErrorDetail: jest.fn() }), { virtual: true });

import {
  ROLE_HOME,
  ROLE_LABELS,
  canEdit,
  canManageDecisions,
  canValidate,
  roleHome,
} from "./AuthContext";

describe("modèle d'accès à trois rôles", () => {
  test("n'expose que les trois profils canoniques", () => {
    expect(Object.keys(ROLE_LABELS)).toEqual(["admin", "dircab", "agency_director"]);
  });

  test("redirige chaque profil vers son espace opérationnel", () => {
    expect(ROLE_HOME).toEqual({
      agency_director: "/ma-direction",
      admin: "/admin-users",
      dircab: "/pilotage-directeur",
    });
    expect(roleHome("agency_director")).toBe("/ma-direction");
  });

  test("réserve la validation métier au DIRCAB et au support admin", () => {
    expect(canValidate("dircab")).toBe(true);
    expect(canValidate("admin")).toBe(true);
    expect(canValidate("agency_director")).toBe(false);
  });

  test.each(["admin", "dircab", "agency_director"])(
    "%s peut gérer les données autorisées par son périmètre backend",
    (role) => {
      expect(canEdit(role)).toBe(true);
      expect(canManageDecisions(role)).toBe(true);
    },
  );
});
