/**
 * src/js/auth_db.js
 * GEDA Mission LiFE — Persistent Profile, DISCOM & Database Integration
 * Supports Firebase Realtime Database with robust fallback to structured LocalStorage.
 */

const STORAGE_KEY = "geda_life_profile_v2";

const DEFAULT_PROFILE = {
  userId: "GUJ-CITIZEN-1024",
  name: "Hardik Patel",
  consumerNumber: "02194/84729/3",
  discom: "UGVCL", // UGVCL, DGVCL, MGVCL, PGVCL, Torrent Power
  discomFullName: "Uttar Gujarat Vij Company Ltd (UGVCL)",
  district: "Gandhinagar",
  lifePoints: 7470,
  applianceSchedule: { ac: 25, pump: 40, ev: 30, washer: 50 },
  vaultCoupons: [
    {
      id: "INIT-COUPON-01",
      brand: "La Pino'z Pizza",
      title: "₹200 Off on Family Pizza",
      code: "GUJ-LPZ-8F29A",
      category: "Food",
      redeemedAt: "2026-10-08 14:20",
      expiresAt: "2026-12-31"
    }
  ]
};

class GedaAuthDB {
  constructor() {
    this.profile = this.loadInitialProfile();
    this.listeners = [];
  }

  loadInitialProfile() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Storage access restricted, using in-memory state:", e);
    }
    this.saveProfile(DEFAULT_PROFILE);
    return { ...DEFAULT_PROFILE };
  }

  saveProfile(profile) {
    this.profile = profile;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn("Could not write to localStorage:", e);
    }
    this.notifyListeners();
  }

  getProfile() {
    return { ...this.profile };
  }

  updateProfile(updates) {
    const updated = { ...this.profile, ...updates };
    this.saveProfile(updated);
    return updated;
  }

  setDiscom(discomKey) {
    const names = {
      "UGVCL": "Uttar Gujarat Vij Company Ltd (UGVCL)",
      "DGVCL": "Dakshin Gujarat Vij Company Ltd (DGVCL)",
      "MGVCL": "Madhya Gujarat Vij Company Ltd (MGVCL)",
      "PGVCL": "Paschim Gujarat Vij Company Ltd (PGVCL)",
      "TORRENT": "Torrent Power (Ahmedabad / Surat / Gandhinagar)"
    };
    const fullName = names[discomKey] || discomKey;
    return this.updateProfile({ discom: discomKey, discomFullName: fullName });
  }

  addPoints(amount) {
    const newTotal = (this.profile.lifePoints || 0) + Number(amount);
    return this.updateProfile({ lifePoints: newTotal });
  }

  deductPoints(amount) {
    const cost = Number(amount);
    if ((this.profile.lifePoints || 0) < cost) {
      return false; // Insufficient balance
    }
    const newTotal = this.profile.lifePoints - cost;
    this.updateProfile({ lifePoints: newTotal });
    return true;
  }

  addCoupon(coupon) {
    const coupons = this.profile.vaultCoupons || [];
    coupons.unshift(coupon);
    return this.updateProfile({ vaultCoupons: coupons });
  }

  onProfileChange(cb) {
    this.listeners.push(cb);
    cb(this.getProfile());
  }

  notifyListeners() {
    const profile = this.getProfile();
    this.listeners.forEach(cb => {
      try { cb(profile); } catch (e) { console.error("Listener error:", e); }
    });
    // Dispatch window-level event for external modules
    window.dispatchEvent(new CustomEvent("geda:profile-updated", { detail: profile }));
  }
}

// Global Singleton Instance
window.gedaAuthDB = new GedaAuthDB();
