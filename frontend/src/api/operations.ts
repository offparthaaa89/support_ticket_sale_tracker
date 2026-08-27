export const ME_QUERY = `
  query Me {
    me {
      id
      name
      email
      role
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token

      user {
        id
        name
        email
        role
      }
    }
  }
`;

export const TICKETS_QUERY = `
  query Tickets(
    $filter: TicketFilterInput
    $page: Int!
    $limit: Int!
  ) {
    tickets: ticketPage(
      filter: $filter
      page: $page
      limit: $limit
    ) {
      items {
        id
        title
        priority
        status
        slaDeadline
        slaState
        createdAt

        assignedAgent {
          id
          name
          email
          role
        }
      }

      page
      limit
      total
      totalPages
    }
  }
`;

export const CREATE_TICKET_MUTATION = `
  mutation CreateTicket(
    $input: CreateTicketInput!
  ) {
    createTicket(input: $input) {
      id
      title
      priority
      status
    }
  }
`;

export const TICKET_QUERY = `
  query Ticket($id: ID!) {
    ticket(id: $id) {
      id
      title
      description
      priority
      status
      firstResponseAt
      slaDeadline
      slaState
      createdAt
      updatedAt

      creator {
        id
        name
        email
        role
      }

      assignedAgent {
        id
        name
        email
        role
      }

      comments {
        id
        content
        createdAt

        author {
          id
          name
          email
          role
        }
      }
    }
  }
`;

export const ADD_COMMENT_MUTATION = `
  mutation AddComment(
    $input: AddCommentInput!
  ) {
    addComment(input: $input) {
      id
      content
      createdAt

      author {
        id
        name
        email
        role
      }
    }
  }
`;

export const ASSIGN_TICKET_MUTATION = `
  mutation AssignTicket(
    $input: AssignTicketInput!
  ) {
    assignTicket(input: $input) {
      id

      assignedAgent {
        id
        name
        role
      }
    }
  }
`;

export const UPDATE_TICKET_STATUS_MUTATION = `
  mutation UpdateTicketStatus(
    $input: UpdateTicketStatusInput!
  ) {
    updateTicketStatus(input: $input) {
      id
      status
    }
  }
`;