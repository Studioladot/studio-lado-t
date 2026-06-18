import { getState, setState } from '../utils/state.js';
import { supabase, fetchUserProfile } from '../services/supabase.js';
import { toast } from '../utils/helpers.js';

let currentStep = 1;
const totalSteps = 4;

export function nextStep() {
  if (currentStep < totalSteps) {
    document.getElementById(`onb-step-${currentStep}`).style.display = 'none';
    currentStep++;
    document.getElementById(`onb-step-${currentStep}`).style.display = 'block';
    updateSteps();
  } else {
    completeOnboarding();
  }
}
window.nextStep = nextStep;

export function prevStep() {
  if (currentStep > 1) {
    document.getElementById(`onb-step-${currentStep}`).style.display = 'none';
    currentStep--;
    document.getElementById(`onb-step-${currentStep}`).style.display = 'block';
    updateSteps();
  }
}
window.prevStep = prevStep;

export async function completeOnboarding() {
  const me = getState().me;
  if (!me) return;
  const brand = document.getElementById('onb-brand')?.value || '';
  const industry = document.getElementById('onb-industry')?.value || 'moda';
  const goal = document.getElementById('onb-goal')?.value || 'crecer';
  try {
    await supabase.from('user_profiles').update({
      brand_name: brand, industry, goal,
      onboarding_completed: true
    }).eq('id', me.id);
    const profile = await fetchUserProfile(me.id);
    setState('userProfile', profile);
    document.getElementById('onboarding-section').style.display = 'none';
    document.getElementById('sidebar').style.display = 'flex';
    document.getElementById('main').style.display = 'block';
    toast('¡Bienvenido a GOTIX!');
  } catch (e) { toast('Error: ' + e.message); }
}
window.completeOnboarding = completeOnboarding;

export function skipOnboarding() {
  document.getElementById('onboarding-section').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('main').style.display = 'block';
  toast('Podés configurar todo después');
}
window.skipOnboarding = skipOnboarding;

function updateSteps() {
  for (let i = 1; i <= totalSteps; i++) {
    const dot = document.getElementById(`onb-dot-${i}`);
    if (dot) dot.className = i === currentStep ? 'onb-dot active' : i < currentStep ? 'onb-dot done' : 'onb-dot';
  }
}

window.nextStep = nextStep;
window.prevStep = prevStep;
window.completeOnboarding = completeOnboarding;
window.skipOnboarding = skipOnboarding;
export default { nextStep, prevStep, completeOnboarding, skipOnboarding };
