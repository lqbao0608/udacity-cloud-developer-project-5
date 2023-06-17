import dateFormat from 'dateformat'
import { History } from 'history'
import update from 'immutability-helper'
import * as React from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Loader,
  Select,
  Container,
  Item
} from 'semantic-ui-react'

import { createTodo, deleteTodo, getTodos, patchTodo } from '../api/todos-api'
import Auth from '../auth/Auth'
import { GetTodosRequest } from '../types/GetTodosRequest'
import { Todo } from '../types/Todo'
import defaultImage from "../assets/images/image.png"

interface TodosProps {
  auth: Auth
  history: History
}

interface TodosState {
  todos: Todo[]
  newTodoName: string
  loadingTodos: boolean
  param: GetTodosRequest
  nextKeyList: string[]
}

const PAGE_SIZES = [
  { key: '5', value: 5, text: '5' },
  { key: '10', value: 10, text: '10' },
  { key: '15', value: 15, text: '15' },
  { key: '20', value: 20, text: '20' },
  { key: '25', value: 25, text: '25' }
]

export class Todos extends React.PureComponent<TodosProps, TodosState> {
  state: TodosState = {
    todos: [],
    newTodoName: '',
    loadingTodos: true,
    param: {
      nextKey: '',
      limit: 5
    },
    nextKeyList: []
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  onEditButtonClick = (todoId: string) => {
    this.props.history.push(`/todos/${todoId}/edit`)
  }

  onTodoCreate = async (event: React.ChangeEvent<HTMLButtonElement>) => {
    try {
      const dueDate = this.calculateDueDate()
      await createTodo(this.props.auth.getIdToken(), {
        name: this.state.newTodoName,
        dueDate
      })
      this.setState({ 
        loadingTodos: true,
        newTodoName: '',
        nextKeyList: [], 
        param: {
          ...this.state.param,
          nextKey: ''
        } 
      });
    } catch {
      alert('Todo creation failed')
    }
  }

  onTodoDelete = async (todoId: string) => {
    try {
      await deleteTodo(this.props.auth.getIdToken(), todoId)
      this.setState({ 
        loadingTodos: true,
        nextKeyList: [], 
        param: {
          ...this.state.param,
          nextKey: ''
        } 
      });
    } catch {
      alert('Todo deletion failed')
    }
  }

  handleCheckCompleted = async (pos: number) => {
    try {
      const todo = this.state.todos[pos]
      await patchTodo(this.props.auth.getIdToken(), todo.todoId, {
        name: todo.name,
        dueDate: todo.dueDate,
        done: !todo.done
      })
      this.setState({
        todos: update(this.state.todos, {
          [pos]: { done: { $set: !todo.done } }
        })
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  handleClickNextButton() {
    this.state.nextKeyList.push(this.state.param.nextKey);
    this.setState({ loadingTodos: true });
  }

  handleClickPrevButton() {
    this.state.nextKeyList.pop();
    this.setState({        
      param: {
        ...this.state.param,
        nextKey: this.state.nextKeyList.at(-1) || ''
      }, 
      loadingTodos: true });
  }

  onChangeLimit = (newLimit: number) => {
    this.setState({ 
      loadingTodos: true,
      nextKeyList: [], 
      param: {
        ...this.state.param,
        limit: newLimit,
        nextKey: ''
      }
    });
  }

  async getTodos() {
    try {
      const result = await getTodos(this.props.auth.getIdToken(), this.state.param);
      this.setState({
        todos: result.items,
        param: {
          ...this.state.param,
          nextKey: result.nextKey ?? '',
        },
        loadingTodos: false
      })
    } catch (e) {
      alert(`Failed to fetch todos: ${(e as Error).message}`)
    }
  }

  async componentDidMount() {
    await this.getTodos();
  }

  async componentDidUpdate(prevProps: any, prevState: TodosState) {
    if (this.state.loadingTodos !== prevState.loadingTodos && this.state.loadingTodos) {
      await this.getTodos();
    }
  }

  render() {
    return (
      <div>
        <Header as="h1">TODO LIST</Header>

        {this.renderCreateTodoInput()}
        {this.renderTodos()}
        {this.renderPaginator()}
      </div>
    )
  }

  renderPaginator() {
    return (
      <Container style={{ paddingBottom: '20px', textAlign: 'right' }}>

        <span style={{ marginRight: '5px' }}>
          Page size:
        </span>

        <Select 
          style={{ marginRight: '10px' }}
          options={PAGE_SIZES} 
          value={this.state.param.limit} 
          onChange={(e, data) => this.onChangeLimit(Number(data.value))} 
        />
        
        <Button 
          primary
          content='Prev'
          onClick={() => this.handleClickPrevButton()}
          disabled={(this.state.nextKeyList.length === 0)} 
        />

        <Button 
          primary
          content='Next'
          onClick={() => this.handleClickNextButton()}
          disabled={(this.state.param.nextKey === null || this.state.param.nextKey === '')} 
        />
      </Container>
    )
  }

  renderCreateTodoInput() {
    return (
      <Grid.Row>
        <Grid.Column width={16}>
          <Input
            action={{
              color: 'teal',
              labelPosition: 'left',
              icon: 'add',
              content: 'New task',
              onClick: this.onTodoCreate
            }}
            fluid
            actionPosition="left"
            placeholder="To change the world..."
            onChange={this.handleNameChange}
          />
        </Grid.Column>
        <Grid.Column width={16}>
          <Divider />
        </Grid.Column>
      </Grid.Row>
    )
  }

  renderTodos() {
    if (this.state.loadingTodos || !this.state.todos) {
      return this.renderLoading()
    }

    return this.renderTodosList()
  }

  renderLoading() {
    return (
      <Grid.Row>
        <Loader indeterminate active inline="centered">
          Loading TODOs
        </Loader>
      </Grid.Row>
    )
  }

  renderTodosList() {
    return (
      <Item.Group divided>
        {this.state.todos.map((todo, pos) => {
          return (
            <Item>
              <Item.Image src={todo.attachmentUrl ? todo.attachmentUrl : defaultImage} size="tiny" wrapped />
              <Item.Content verticalAlign='middle'>
                <Item.Header>{todo.name}</Item.Header>
                <Item.Meta>
                  <span className='cinema'>Due date: {todo.dueDate}</span>
                </Item.Meta>
                <Item.Extra>
                  <Checkbox label='Completed'
                            onChange={() => this.handleCheckCompleted(pos)}
                            checked={todo.done} />
                  <Button.Group floated="right" size='mini'>
                    <Button
                      icon
                      color="blue"
                      onClick={() => this.onEditButtonClick(todo.todoId)}
                    >
                      <Icon name="pencil" />
                    </Button>
                    <Button
                      icon
                      color="red"
                      onClick={() => this.onTodoDelete(todo.todoId)}
                    >
                      <Icon name="delete" />
                    </Button>
                  </Button.Group>
                </Item.Extra>
              </Item.Content>
            </Item>
          )
        })}
      </Item.Group>
    )
  }

  calculateDueDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    return dateFormat(date, 'yyyy-mm-dd') as string
  }
}
