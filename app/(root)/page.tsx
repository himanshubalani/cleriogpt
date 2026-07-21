import { ConversationView } from '@/features/conversation/components/conversation-view';
import { generateId } from 'ai';

const page = async () => {
  // Generate a temporary ID. It won't be saved to the DB until a message is sent.
  const id = generateId();
  
  return (
    <ConversationView
      key={id} 
      conversationId={id} 
      initialMessages={[]} 
    />
  )
}

export default page