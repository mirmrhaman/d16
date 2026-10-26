const validEmail = (value) => typeof value === 'string'
  && value.length <= 254
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function canSendConsultationEmailReply(consultation, user) {
  return Boolean(
    consultation?.assigned_to_user_id
    && user?.id
    && consultation.assigned_to_user_id === user.id
    && validEmail(user.email)
    && validEmail(consultation.email),
  );
}
